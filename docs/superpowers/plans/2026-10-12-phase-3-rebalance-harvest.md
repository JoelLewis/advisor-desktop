# Phase 3: Brief, Rebalance and Harvest, Client Thread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On branch `workspace`, run the acc-002 story end to end as Adrian Hale: a Brief ready on load, a Proposal agent that drafts and revises a tax-aware rebalance under constraints, a workbench linked live to the team thread, approval of one exact version as a recorded act with orders staged `pending_compliance`, and a Client Letter agent whose draft Adrian edits and sends to Robert.

**Architecture:** The rebalance engine (`src/mocks/handlers/oms.ts`) gains constraint-aware generation, a lot-level leg re-cut and an extracted preview builder. A proposal engine (`src/mocks/workspace/proposal-engine.ts`) turns constraints and workbench edits into versions (preview, proposal-level pre-trade check, tax summary, fingerprint). Proposals, approvals and staged orders live in the workspace session store and reset with it. Three scripted agents (Harvest Scanner, Proposal Agent, Client Letter Agent) work through engine functions; binding acts (`approve_proposal`, `withdraw_approval`) join `send_to_client`. Viewer-filtered handlers serve it all; the UI reads it through `src/services/workspace.ts` and `src/hooks/use-workspace.ts`, and every write invalidates `['workspace']`, which is what links the thread, the embed and the workbench in real time.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, TanStack Query 5, React Router 6 (v7 future flags), MSW 2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-phase-3-rebalance-harvest-design.md` (binding). Earlier contracts: `docs/superpowers/specs/2026-10-11-phase-2-workspace-shell-design.md`, `docs/superpowers/specs/2026-10-11-phase-0-scenario-truth-design.md`.

## Global Constraints

- Work only on branch `workspace` (base: `a579bb4` or a later `workspace` commit containing every task this one depends on — check `git log --oneline -1` before starting and report BLOCKED if a prerequisite task's commit is missing). Never commit to `main`. Push only when the controller says so.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums; ESM; no barrel files. `.tsx` files export only components; helpers and types go in `.ts` siblings. On macOS's case-insensitive filesystem never place `foo.ts` next to `Foo.tsx`.
- Tests: `node_modules/.bin/vitest run <path>`; full suite `node_modules/.bin/vitest run`; then `pnpm lint` (`--max-warnings 0`) and `pnpm build`. Restore `tsconfig.tsbuildinfo` / `wrangler.jsonc` with `git checkout --` if a tool modifies them. Never symlink `node_modules` between worktrees. A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`). `VISUAL_PORT=5195 pnpm visual:update` only for an intended change, and the implementer opens and looks at every PNG it rewrote. Tasks 6 and 7 intentionally change what the thread list shows (new agents), so shell baselines drift from Task 6 onward; Task 18 regenerates and reviews all of them. Tasks 1–17 do not run `pnpm visual`.
- Frozen today is `2026-02-25` (`MOCK_TODAY_ISO`); frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`). Never read the live clock (`new Date()` / `Date.now()` are banned in `src/mocks` by test). Recorded times come from the event clock: `nextAt()` in `src/mocks/data/workspace-store.ts`.
- The INTC harvest is `rs-001`: 5,000 INTC sold Fri 2026-02-20 at −$32,750, window 2026-01-21 to 2026-03-22. A sale of the remaining 7,000 INTC today opens a window to 2026-03-27.
- Every displayed figure comes from the engine; the UI never computes a figure (no sums, no differences) and formats only through `src/kit/measure.ts`. Agent claim text and Proposal Agent change summaries contain no digits. The Client Letter draft is client prose, not a claim: its figures come from the approved version and are formatted only by `clientMoney` / `clientDate` from `src/kit/measure.ts`.
- UI uses only kit components (`src/kit/`) for buttons, tables, dialogs, inputs, selects and checkboxes, and only instrument colour tokens. The guardrails in `src/__tests__/guardrails/` must stay green.
- No real person's name. Adrian Hale `user-001` (advisor), Sarah Mitchell `user-002` (client service), Mike Chen `user-003` (analyst), Mark Davis `cco-001` (compliance), Robert Johnson `cli-001` (client). Patricia Johnson `cli-002` is Robert's spouse in the fixtures.
- Demo model: one presenter acts as Adrian. No step requires another person to act live; "view as" only shows visibility.
- Domain wording, exactly: never "cleared"; never "would exceed" for an approaching limit; `cash_capped` reads "held to the model's cash target"; wash-sale scope is the **taxpayer** (owner and spouse, IRAs and Roths included), never "household"; a coin held directly is outside §1091; an IRA or Roth replacement makes the loss **permanently disallowed**; tax rates 40.8% short-term, 23.8% long-term, 31.8% collectibles (`RATE_DISCLOSURE`); the return-level estimate nets against the return's year-to-date results.
- Client threads: agents never post there; drafts are firm-only; `send_to_client` is the recorded act. Client viewers get `404` for anything hidden (threads, proposals, drafts, letters), never `403`.
- Visibility words exactly: "Only you" / "Firm only · client can't see" / "CLIENT CAN SEE".
- Commit messages end with `Co-Authored-By: Claude <the name of the model writing the commit> <noreply@anthropic.com>`.

## Review Focus

1. **A stale or repeated approval.** Approve is sent with the fingerprint of a version that is no longer the one on screen (a newer version arrived from the other pane), or Approve is double-clicked: the engine records at most one act, answers the stale one `409 FINGERPRINT_MISMATCH` / the repeat `409 ALREADY_APPROVED`, and the UI shows the engine's reason and no second slip. Tests: Task 5 (engine), Task 15 (UI).
2. **Invalid workbench edits** — quantity `0`, negative, not a number, fractional for a share leg, more than held; every lot unchecked; a lot from another position; lots that hold fewer shares than the sale; an edit naming a symbol that is not a leg. The engine answers `400` with a reason and saves nothing; the workbench keeps the draft, shows the reason, and disables Save. (A blank quantity field means "back to the agent's quantity", not an error.) Tests: Task 2, Task 4 (engine), Task 14 (UI).
3. **A client probing proposals.** Robert requests `/api/workspace/proposals`, `/api/workspace/proposals/prop-0001`, its preview, a letter draft, or opens `/proposals/prop-0001`: `404` and "Proposal not found", never content; switching "view as" to Robert on the workbench goes home. Tests: Task 9, Task 12.
4. **A letter that goes stale.** Adrian drafts the letter from v2, then approves v3 or withdraws: the draft is served `stale: true`, the Send button is disabled with the reason, and `send_to_client` refuses it `409 STALE_DRAFT`. Tests: Task 5, Task 8 (engine), Task 16 (UI).
5. **Repeated asks.** "Ask Proposal Agent", "Take to team thread" and "Ask Client Letter Agent" clicked twice: one proposal, one carried card, one letter draft; the second request returns the first result. Tests: Tasks 6, 7, 8 (engine), Tasks 10, 11, 16 (UI).

## Task order, shared contracts and parallelism

| Task | Depends on | Shares files or types with | May run in parallel with |
|---|---|---|---|
| 1 Types, proposals store | — | types read by every later task | 2 |
| 2 Preview builder, lot re-cut (`oms.ts`) | — | `oms.ts` with 3 | 1 |
| 3 Constraint-aware generation (`oms.ts`) | 2 | `oms.ts`, `RebalanceProposal`, `ResidualDriftReason` | 6 (after 1) |
| 4 Version builder | 1, 3 | `DraftPreview`, `ProposalVersion` | 6 |
| 5 Approve and withdraw acts | 4 | `acts.ts`, `ApprovalRecord`, `StagedOrder` | 6, 7 |
| 6 Harvest Scanner, Brief, carrying | 1 | `registry.ts`, `run-agent.ts`, `workspace-store.ts` | 2, 3, 4, 5 |
| 7 Proposal Agent, proposal operations | 4, 6 | `run-agent.ts` (after 6), `workspace-seed.ts` | 5 |
| 8 Client Letter Agent, letter drafts | 5, 7 | `Draft` type | — |
| 9 API, services, hooks | 5, 6, 7, 8 | `workspace.ts` handlers, services, hooks | 17 |
| 10 Thread UI: embed, versions, Brief, carry | 9 | `MessageView.tsx`, `ProposalEmbed.tsx` | 17 |
| 11 Revise, Ask Proposal Agent, kit inputs | 10 | `ProposalEmbed.tsx`, `AskAgents.tsx`, kit | 17 |
| 12 Workbench route, side-by-side layout | 11 | `routes.tsx`, `WorkspaceShell.tsx` | 17 |
| 13 Workbench legs, lots, summary | 12 | `src/workspace/workbench/*`, kit `DataTable` | 15, 16, 17 |
| 14 Workbench editing and keyboard | 13 | `src/workspace/workbench/*` | 15, 16, 17 |
| 15 Approve in the context column | 12 | `ContextColumn.tsx` | 13, 14, 16, 17 |
| 16 Client letter and send | 12 | `DraftsPanel.tsx` | 13, 14, 15, 17 |
| 17 Carry-overs: NBA routes, nba-002 score | — | `nbas.ts` only | any task |
| 18 End-to-end path and visual baselines | all | `e2e-visual/*` | — |

Everything not in the last column is serial. Parallel tasks run in separate worktrees created from a commit that already contains all of their prerequisites; merge them one at a time with the full suite green between merges.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/types/workspace.ts` | 1 | agent ids and outputs, new message kinds, letter basis on drafts, act version |
| `src/types/workspace-proposal.ts` (new) | 1 | constraints, edits, versions, approvals, staged orders, details, draft previews |
| `src/mocks/data/workspace-store.ts` | 1, 6 | session state gains proposals, approvals, staged orders; lazy seed with the Brief |
| `src/mocks/data/proposals-store.ts` (new) | 1 | proposal reads, ids, approval state, stale-draft test |
| `src/mocks/data/people.ts` | 1 | three new agents with scopes |
| `src/mocks/agents/registry.ts` | 1, 6 | runners only for finding agents |
| `src/services/oms.ts` | 3 | `ResidualDriftReason` gains constraint reasons |
| `src/mocks/handlers/oms.ts` | 2, 3 | preview builder, lot re-cut, constraints, gain cap, held-back reasons |
| `src/mocks/handlers/batch-wash-sales.ts` | 3 | batch entries need only legs and sales |
| `src/mocks/workspace/proposal-engine.ts` (new) | 4 | parse, normalise, apply edits, build a version, tax summary, edit summary |
| `src/mocks/workspace/proposal-acts.ts` (new) | 5 | approve, withdraw, staging |
| `src/mocks/workspace/acts.ts` | 5 | a stale letter cannot be sent |
| `src/mocks/agents/harvest-scanner.ts` (new) | 6 | harvestable losses, washed parts, windows, restrictions, held-away |
| `src/mocks/workspace/run-key.ts` (new) | 6 | the run key shared by runs and the Brief seed |
| `src/mocks/workspace/brief.ts` (new) | 6 | the Brief's findings and ranked summary |
| `src/mocks/workspace/carry.ts` (new) | 6 | carrying a Brief finding into a team thread |
| `src/mocks/agents/proposal-agent.ts` (new) | 7 | titles and digit-free summaries |
| `src/mocks/workspace/proposals.ts` (new) | 7 | create, revise, save version, preview edits |
| `src/mocks/agents/client-letter.ts` (new) | 8 | the letter body and its figures |
| `src/mocks/workspace/letters.ts` (new) | 8 | letter drafts, draft revisions, drafts served with staleness |
| `src/mocks/handlers/workspace-http.ts` (new) | 9 | shared handler helpers |
| `src/mocks/handlers/workspace-proposals.ts` (new) | 9 | proposal endpoints |
| `src/mocks/handlers/workspace.ts` | 9 | acts, carry, letters, draft revisions, stale drafts |
| `src/services/workspace.ts`, `src/hooks/use-workspace.ts` | 9 | client functions and viewer-scoped hooks |
| `src/workspace/proposal/*` (new) | 10, 11 | embed parts, wording, revise dialog |
| `src/workspace/thread/*` | 10 | message kinds, carry control, Brief summary |
| `src/kit/checkbox/Checkbox.tsx`, `src/kit/number-input/NumberInput.tsx` (new) | 11 | labelled checkbox and number input |
| `src/kit/data-table/DataTable.tsx`, `types.ts` | 13 | row keys and muted rows |
| `src/workspace/workbench/*` (new) | 12, 13, 14 | workbench page, thread column, legs, lots, summary, editing |
| `src/workspace/shell/*`, `src/app/routes.tsx`, `src/app/use-destinations.ts` | 12 | hidden thread list, route, command line |
| `src/workspace/context/ApprovalPanel.tsx` (new) | 15 | approve, withdraw, staged orders |
| `src/workspace/context/DraftsPanel.tsx`, `LetterControl.tsx` (new) | 16 | letter drafting, staleness, edit, send |
| `src/mocks/data/nbas.ts` | 17 | workspace action routes; nba-002 priority and impact from the engine |
| `e2e-visual/rebalance-job.spec.ts` (new) | 18 | the story end to end and its baselines |

---

### Task 1: Types and the proposals store

**Files:**
- Modify: `src/types/workspace.ts`, `src/mocks/data/people.ts`, `src/mocks/agents/registry.ts`, `src/mocks/data/workspace-store.ts`, `src/mocks/handlers/__tests__/workspace-read.test.ts` (directory agents assertion)
- Create: `src/types/workspace-proposal.ts`, `src/mocks/data/proposals-store.ts`
- Test: `src/mocks/data/__tests__/proposals-store.test.ts`, `src/mocks/data/__tests__/people.test.ts` (append)

**Interfaces:**
- Consumes: `RebalancePreview`, `ProposedTrade`, `PreTradeCheckProposalResult` from `@/services/oms`; `AssetClass` from `@/types/portfolio`; `CurrencyCode` from `@/types/currency`; `eventTime` from `@/lib/clock`.
- Produces (every later task relies on these names exactly):

```ts
// src/types/workspace.ts (changed and added members)
export type AgentId = 'drift-monitor' | 'pretrade-check' | 'harvest-scanner' | 'proposal' | 'client-letter'
/** What an agent produces: findings in a thread, proposal versions, or client-letter drafts. */
export type AgentOutput = 'findings' | 'proposals' | 'letters'
export type AgentProfile = { id: AgentId; name: string; produces: AgentOutput; scope: AgentScope }
export type Subject = { type: 'account' | 'household' | 'client' | 'draft' | 'proposal'; id: string }
export type VersionAuthor = { kind: 'agent'; agentId: AgentId } | { kind: 'person'; personId: string }
export type CarriedFinding = { agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention }
export type BriefItem = { findingId: string; agentId: AgentId; claim: string; attention: Attention }
export type Message =
  | /* the four Phase 2 kinds, unchanged */
  | { kind: 'proposal'; id: string; threadId: string; agentId: AgentId; at: string; proposalId: string }
  | { kind: 'proposal_version'; id: string; threadId: string; at: string; proposalId: string; version: number; author: VersionAuthor; changeSummary: string }
  | { kind: 'carried'; id: string; threadId: string; at: string; carriedBy: string; fromThreadId: string; findingId: string; finding: CarriedFinding }
  | { kind: 'brief_summary'; id: string; threadId: string; at: string; items: BriefItem[] }
export type BindingAct = { id: string; kind: BindingActKind; actorId: string; at: string; threadId: string; subject?: Subject; version?: number; fingerprint: string; summary: string }
export type LetterBasis = { proposalId: string; version: number; fingerprint: string }
export type Draft = { id: string; clientThreadId: string; authorId: string; body: string; createdAt: string; agentId?: AgentId; basis?: LetterBasis; figures?: Figure[]; supersedes?: string; stale?: boolean }

// src/types/workspace-proposal.ts
export type ProposalConstraint = { kind: 'harvest_only' } | { kind: 'cap_realised_gains'; usd: number } | { kind: 'exclude_asset_class'; assetClass: AssetClass } | { kind: 'avoid_self_wash' }
export type LegEdit = { kind: 'exclude'; symbol: string } | { kind: 'quantity'; symbol: string; quantity: number } | { kind: 'lots'; symbol: string; lotIds: string[] }
export type LegFacts = { symbol: string; lotIds: string[]; washed: number }
export type ExcludedLeg = Pick<ProposedTrade, 'symbol' | 'name' | 'side' | 'quantity' | 'estimatedValue'>
export type ProposalTaxSummary = { sold: number; bought: number; gains: number; losses: number; netShortTerm: number; netLongTerm: number; washed: number; grossTax: number; netTax: number }
export type ProposalVersion = { n: number; author: VersionAuthor; createdAt: string; constraints: ProposalConstraint[]; edits: LegEdit[]; preview: RebalancePreview; pretrade: PreTradeCheckProposalResult; legFacts: LegFacts[]; excludedLegs: ExcludedLeg[]; summary: ProposalTaxSummary; fingerprint: string; changeSummary: string }
export type DraftPreview = Pick<ProposalVersion, 'preview' | 'pretrade' | 'legFacts' | 'excludedLegs' | 'summary' | 'fingerprint'>
export type Proposal = { id: string; title: string; accountId: string; clientId: string; threadId: string; versions: ProposalVersion[] }
export type ApprovalRecord = { proposalId: string; version: number; fingerprint: string; actId: string; approverId: string; at: string; status: 'active' | 'withdrawn' | 'superseded' }
export type StagedOrder = { id: string; proposalId: string; version: number; accountId: string; symbol: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; currency: CurrencyCode; status: 'pending_compliance' | 'withdrawn'; stagedAt: string; approvalActId: string }
export type ApprovalState = { kind: 'unapproved'; latestVersion: number } | { kind: 'approved'; version: number; latestVersion: number; approverId: string; actId: string }
export type ProposalDetail = Proposal & { approval: ApprovalState; staged: StagedOrder[] }

// src/mocks/data/workspace-store.ts
export type WorkspaceState = { threads: Thread[]; messages: Message[]; acts: BindingAct[]; drafts: Draft[]; proposals: Proposal[]; approvals: ApprovalRecord[]; staged: StagedOrder[]; sequence: number; counters: Record<'msg' | 'draft' | 'act' | 'proposal' | 'staged', number> }
export function store(): WorkspaceState            // seeds lazily on first use after a reset
export function resetWorkspaceStore(): void
export function nextAt(): string
export function nextNumber(counter: 'msg' | 'draft' | 'act' | 'proposal' | 'staged'): number
export function nextId(prefix: 'msg' | 'draft'): string
export function commitActId(): string

// src/mocks/data/proposals-store.ts
export function proposalById(id: string): Proposal | undefined
export function proposalsInThread(threadId: string): Proposal[]
export function latestVersion(proposal: Proposal): ProposalVersion
export function nextProposalId(): string           // prop-0001 …
export function nextStagedId(): string             // stg-0001 …
export function activeApproval(proposalId: string): ApprovalRecord | undefined
export function approvalState(proposal: Proposal): ApprovalState
export function stagedFor(proposalId: string): StagedOrder[]
export function detailOf(proposal: Proposal): ProposalDetail
export function isDraftStale(draft: Draft): boolean
```

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/data/__tests__/proposals-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Draft } from '@/types/workspace'
import type { Proposal, ProposalVersion } from '@/types/workspace-proposal'
import { resetWorkspaceStore, store } from '../workspace-store'
import {
  activeApproval, approvalState, detailOf, isDraftStale, latestVersion, nextProposalId, nextStagedId, proposalById, proposalsInThread,
} from '../proposals-store'

function version(n: number, fingerprint: string): ProposalVersion {
  return {
    n, author: { kind: 'agent', agentId: 'proposal' }, createdAt: '2026-02-25T12:05:00.000Z', constraints: [{ kind: 'avoid_self_wash' }], edits: [],
    preview: {
      accountId: 'acc-002', currency: 'USD', trades: [], estimatedTaxImpact: 0, ytdRealisedOnReturn: null, nettedWithAccountIds: [], grossTaxOnGains: 0,
      taxable: true, repurchaseRestrictions: [],
      projectedDrift: { driftTolerance: 0.05, driftThreshold: 0.005, totalDrift: 0, maxAbsDrift: 0, withinBand: true, assetClassDrifts: [] },
    },
    pretrade: { accountId: 'acc-002', passed: true, violations: [], legs: [], projectedCash: 0, projectedCashPct: 0, minimumCash: 0 },
    legFacts: [], excludedLegs: [],
    summary: { sold: 0, bought: 0, gains: 0, losses: 0, netShortTerm: 0, netLongTerm: 0, washed: 0, grossTax: 0, netTax: 0 },
    fingerprint, changeSummary: 'Drafted a rebalance.',
  }
}

function seedProposal(): Proposal {
  const proposal: Proposal = {
    id: nextProposalId(), title: 'Johnson rebalance', accountId: 'acc-002', clientId: 'cli-001', threadId: 'th-johnson-review',
    versions: [version(1, 'AAAAAAAA')],
  }
  store().proposals.push(proposal)
  return proposal
}

const letter = (basis: Draft['basis']): Draft => ({ id: 'draft-0001', clientThreadId: 'th-robert', authorId: 'user-001', body: 'x', createdAt: 'x', agentId: 'client-letter', basis })

describe('proposals store', () => {
  beforeEach(() => resetWorkspaceStore())

  it('starts empty and resets with the workspace store', () => {
    expect(store().proposals).toEqual([])
    expect(store().approvals).toEqual([])
    expect(store().staged).toEqual([])
    seedProposal()
    resetWorkspaceStore()
    expect(store().proposals).toEqual([])
    expect(nextProposalId()).toBe('prop-0001')
  })

  it('allocates proposal and staged-order ids in sequence', () => {
    expect(nextProposalId()).toBe('prop-0001')
    expect(nextProposalId()).toBe('prop-0002')
    expect(nextStagedId()).toBe('stg-0001')
  })

  it('finds proposals by id and by thread, and the latest version', () => {
    const p = seedProposal()
    p.versions.push(version(2, 'BBBBBBBB'))
    expect(proposalById(p.id)).toBe(p)
    expect(proposalById('prop-9999')).toBeUndefined()
    expect(proposalsInThread('th-johnson-review').map((x) => x.id)).toEqual([p.id])
    expect(proposalsInThread('th-robert')).toEqual([])
    expect(latestVersion(p).n).toBe(2)
  })

  it('reports approval state: none, the latest, or an older version with the newer unapproved', () => {
    const p = seedProposal()
    expect(approvalState(p)).toEqual({ kind: 'unapproved', latestVersion: 1 })
    store().approvals.push({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA', actId: 'REC-0001', approverId: 'user-001', at: 'x', status: 'active' })
    expect(approvalState(p)).toEqual({ kind: 'approved', version: 1, latestVersion: 1, approverId: 'user-001', actId: 'REC-0001' })
    p.versions.push(version(2, 'BBBBBBBB'))
    expect(approvalState(p)).toEqual({ kind: 'approved', version: 1, latestVersion: 2, approverId: 'user-001', actId: 'REC-0001' })
    store().approvals = store().approvals.map((a) => ({ ...a, status: 'withdrawn' as const }))
    expect(activeApproval(p.id)).toBeUndefined()
    expect(approvalState(p)).toEqual({ kind: 'unapproved', latestVersion: 2 })
  })

  it('serves a detail with its approval state and staged orders', () => {
    const p = seedProposal()
    store().staged.push({ id: 'stg-0001', proposalId: p.id, version: 1, accountId: 'acc-002', symbol: 'INTC', side: 'sell', quantity: 7000, estimatedValue: 199150, currency: 'USD', status: 'pending_compliance', stagedAt: 'x', approvalActId: 'REC-0001' })
    const detail = detailOf(p)
    expect(detail.approval.kind).toBe('unapproved')
    expect(detail.staged.map((s) => s.id)).toEqual(['stg-0001'])
  })

  it('a letter is stale unless its exact version is the active approval', () => {
    const p = seedProposal()
    expect(isDraftStale({ ...letter(undefined), agentId: undefined })).toBe(false)
    expect(isDraftStale(letter({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA' }))).toBe(true)
    store().approvals.push({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA', actId: 'REC-0001', approverId: 'user-001', at: 'x', status: 'active' })
    expect(isDraftStale(letter({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA' }))).toBe(false)
    expect(isDraftStale(letter({ proposalId: p.id, version: 1, fingerprint: 'CCCCCCCC' }))).toBe(true)
    expect(isDraftStale(letter({ proposalId: 'prop-9999', version: 1, fingerprint: 'AAAAAAAA' }))).toBe(true)
  })
})
```

Append to `src/mocks/data/__tests__/people.test.ts` (it already imports `AGENTS` from `../people`):

```ts
describe('phase 3 agents', () => {
  it('the desk has five agents, each producing one kind of output', () => {
    expect(AGENTS.map((a) => [a.id, a.produces])).toEqual([
      ['drift-monitor', 'findings'], ['pretrade-check', 'findings'], ['harvest-scanner', 'findings'],
      ['proposal', 'proposals'], ['client-letter', 'letters'],
    ])
  })
  it('the Proposal Agent may not approve or release; the Client Letter Agent may not send', () => {
    expect(AGENTS.find((a) => a.id === 'proposal')?.scope.mayNot).toEqual(['approve', 'release', 'post in a client thread'])
    expect(AGENTS.find((a) => a.id === 'client-letter')?.scope.mayNot).toEqual(['send', 'post in a client thread'])
    expect(AGENTS.find((a) => a.id === 'harvest-scanner')?.scope.mayNot).toEqual(['stage trades', 'post in a client thread'])
  })
})
```

In `src/mocks/handlers/__tests__/workspace-read.test.ts` change the directory assertion to:

```ts
    expect(body.agents.map((a: { id: string }) => a.id)).toEqual(['drift-monitor', 'pretrade-check', 'harvest-scanner', 'proposal', 'client-letter'])
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/proposals-store.test.ts src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/workspace-read.test.ts`
Expected: FAIL — `proposals-store` does not exist; the directory has two agents.

- [ ] **Step 3: Write the types**

In `src/types/workspace.ts` replace the `AgentId`, `AgentProfile`, `Subject`, `Message`, `BindingAct` and `Draft` lines with the declarations in **Interfaces** above (the Message union keeps its four Phase 2 members first, then the four new ones), and add `AgentOutput`, `VersionAuthor`, `CarriedFinding`, `BriefItem` and `LetterBasis`. Create `src/types/workspace-proposal.ts` exactly as in **Interfaces**, with these imports:

```ts
import type { AssetClass } from './portfolio'
import type { CurrencyCode } from './currency'
import type { VersionAuthor } from './workspace'
import type { PreTradeCheckProposalResult, ProposedTrade, RebalancePreview } from '@/services/oms'
```

Add one doc comment per exported type in `workspace-proposal.ts`, for example on `LegEdit`: `/** A workbench change applied on top of the agent's legs; the engine re-validates it. */`, on `LegFacts`: `/** What each sell leg disposes of: its lots in sale order, and the part of its loss §1091 washes (≤ 0). */`, on `ProposalConstraint`'s `cap_realised_gains`: `/** Upper bound on the proposal's realised gains, gain legs only and losses not netted, in the account's currency. */`.

- [ ] **Step 4: Add the agents**

In `src/mocks/data/people.ts` replace `AGENTS` with:

```ts
export const AGENTS: readonly AgentProfile[] = [
  { id: 'drift-monitor', name: 'Drift Monitor', produces: 'findings', scope: { may: ['measure and flag'], mayNot: ['stage or release trades', 'post in a client thread'] } },
  { id: 'pretrade-check', name: 'Pre-trade Check', produces: 'findings', scope: { may: ['run checks and report'], mayNot: ['clear a block', 'release orders', 'post in a client thread'] } },
  { id: 'harvest-scanner', name: 'Harvest Scanner', produces: 'findings', scope: { may: ['measure harvestable losses and their windows'], mayNot: ['stage trades', 'post in a client thread'] } },
  { id: 'proposal', name: 'Proposal Agent', produces: 'proposals', scope: { may: ['draft and revise proposals under constraints'], mayNot: ['approve', 'release', 'post in a client thread'] } },
  { id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft a client message from an approved version'], mayNot: ['send', 'post in a client thread'] } },
]
```

In `src/mocks/agents/registry.ts` map only the agents that have a finding runner (Task 6 adds the Harvest Scanner's):

```ts
import type { AgentId } from '@/types/workspace'
import type { AgentDefinition } from './agent'
import { AGENTS } from '@/mocks/data/people'
import { runDriftMonitor } from './drift-monitor'
import { runPretradeCheck } from './pretrade-check'

/** Agents that report findings in a thread. The Proposal and Client Letter agents work through their own operations. */
const RUNNERS: ReadonlyMap<AgentId, AgentDefinition['run']> = new Map<AgentId, AgentDefinition['run']>([
  ['drift-monitor', runDriftMonitor],
  ['pretrade-check', runPretradeCheck],
])

export const AGENT_DEFINITIONS: ReadonlyMap<AgentId, AgentDefinition> = new Map(
  AGENTS.flatMap((a): [AgentId, AgentDefinition][] => {
    const run = RUNNERS.get(a.id)
    return run ? [[a.id, { ...a, run }]] : []
  }),
)
```

Anything else that builds an `AgentProfile` literal (grep `scope: { may` under `src/`, including tests) gains `produces: 'findings'`.

- [ ] **Step 5: Extend the store and write the proposals store**

`src/mocks/data/workspace-store.ts`:

```ts
import type { BindingAct, Draft, Message, Thread } from '@/types/workspace'
import type { ApprovalRecord, Proposal, StagedOrder } from '@/types/workspace-proposal'
import { eventTime } from '@/lib/clock'
import { SEED_LAST_SEQUENCE, SEED_MESSAGES, SEED_THREADS } from './workspace-seed'

type Counter = 'msg' | 'draft' | 'act' | 'proposal' | 'staged'

export type WorkspaceState = {
  threads: Thread[]
  messages: Message[]
  acts: BindingAct[]
  drafts: Draft[]
  proposals: Proposal[]
  approvals: ApprovalRecord[]
  staged: StagedOrder[]
  sequence: number
  counters: Record<Counter, number>
}

function seed(): WorkspaceState {
  return {
    threads: SEED_THREADS.map((t) => ({ ...t, memberIds: [...t.memberIds], agentIds: [...t.agentIds] })),
    messages: SEED_MESSAGES.map((m) => ({ ...m })),
    acts: [],
    drafts: [],
    proposals: [],
    approvals: [],
    staged: [],
    sequence: SEED_LAST_SEQUENCE,
    counters: { msg: 0, draft: 0, act: 0, proposal: 0, staged: 0 },
  }
}

// Seeded on first use, not at import: the seed reads the engine (Task 6 adds the Brief), and the
// engine must finish loading before anything runs it.
let state: WorkspaceState | undefined

export function store(): WorkspaceState {
  state ??= seed()
  return state
}

export function resetWorkspaceStore(): void {
  state = undefined
}

export function nextAt(): string {
  const s = store()
  s.sequence += 1
  return eventTime(s.sequence)
}

/** Allocates the next number on `counter`. */
export function nextNumber(counter: Counter): number {
  const s = store()
  s.counters[counter] += 1
  return s.counters[counter]
}

const pad = (n: number) => String(n).padStart(4, '0')

export function nextId(prefix: 'msg' | 'draft'): string {
  return `${prefix}-${pad(nextNumber(prefix))}`
}

export function commitActId(): string {
  return `REC-${pad(nextNumber('act'))}`
}
```

`src/mocks/data/proposals-store.ts`:

```ts
import type { Draft } from '@/types/workspace'
import type { ApprovalRecord, ApprovalState, Proposal, ProposalDetail, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { nextNumber, store } from './workspace-store'

const pad = (n: number) => String(n).padStart(4, '0')

export function proposalById(id: string): Proposal | undefined {
  return store().proposals.find((p) => p.id === id)
}

export function proposalsInThread(threadId: string): Proposal[] {
  return store().proposals.filter((p) => p.threadId === threadId)
}

export function latestVersion(proposal: Proposal): ProposalVersion {
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${proposal.id} has no versions`)
  return latest
}

export const nextProposalId = (): string => `prop-${pad(nextNumber('proposal'))}`
export const nextStagedId = (): string => `stg-${pad(nextNumber('staged'))}`

export function activeApproval(proposalId: string): ApprovalRecord | undefined {
  return store().approvals.find((a) => a.proposalId === proposalId && a.status === 'active')
}

/** Approval belongs to one exact version; a newer version leaves it on the older one. */
export function approvalState(proposal: Proposal): ApprovalState {
  const latest = latestVersion(proposal).n
  const active = activeApproval(proposal.id)
  return active
    ? { kind: 'approved', version: active.version, latestVersion: latest, approverId: active.approverId, actId: active.actId }
    : { kind: 'unapproved', latestVersion: latest }
}

export function stagedFor(proposalId: string): StagedOrder[] {
  return store().staged.filter((o) => o.proposalId === proposalId)
}

export function detailOf(proposal: Proposal): ProposalDetail {
  return { ...proposal, approval: approvalState(proposal), staged: stagedFor(proposal.id) }
}

/** A letter is current only while the exact version it was written from is the active approval. */
export function isDraftStale(draft: Draft): boolean {
  if (!draft.basis) return false
  const { proposalId, version, fingerprint } = draft.basis
  const active = activeApproval(proposalId)
  return !active || active.version !== version || active.fingerprint !== fingerprint
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/proposals-store.test.ts src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/workspace-read.test.ts src/mocks/data/__tests__/workspace-seed.test.ts`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`
Expected: green. `MessageView` has no case for the four new message kinds yet; nothing produces them until Task 6, and Task 10 renders them.

- [ ] **Step 8: Commit**

```bash
git add src/types/workspace.ts src/types/workspace-proposal.ts src/mocks/data/workspace-store.ts src/mocks/data/proposals-store.ts src/mocks/data/people.ts src/mocks/agents/registry.ts src/mocks/data/__tests__/proposals-store.test.ts src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/workspace-read.test.ts
git commit -m "feat(engine): proposal types, the proposals store and three new agents in the directory"
```

### Task 2: The preview builder and the lot-level leg re-cut

The `/api/oms/rebalance` handler assembles each preview inline. A proposal version needs the same assembly for one account, and a workbench edit needs one leg re-realised at a new quantity or from chosen lots. This task extracts the first and adds the second, without changing any existing output.

**Files:**
- Modify: `src/mocks/handlers/oms.ts`
- Test: `src/mocks/handlers/__tests__/rebalance-preview-builder.test.ts`, `src/mocks/handlers/__tests__/recut-leg.test.ts`

**Interfaces:**
- Consumes: existing `generateRebalanceProposal`, `settleBatchWashSales`, `estimateTaxOnReturns`, `repurchaseRestrictionsFor`, `projectDrift`, `generateTaxLots`, `washSaleAcquisitions`, `hasWashSaleRisk`, `modelImplementationSecurity`.
- Produces:

```ts
// src/mocks/handlers/oms.ts
export type PreviewEntry = { account: Account } & RebalanceProposal
/** The rebalance previews of a batch, exactly as `/api/oms/rebalance` serves them. */
export function buildRebalancePreviews(proposed: readonly PreviewEntry[], taxAware: boolean, driftThreshold: number | undefined, asOfISO: string): RebalancePreview[]
export type LegCut = { quantity: number; lotIds?: readonly string[] }
export type RecutFailure = { ok: false; code: 'BAD_QUANTITY' | 'OVER_HELD' | 'LOT_NOT_IN_POSITION' | 'LOTS_TOO_SMALL' | 'LOTS_ON_BUY'; message: string }
/** A leg re-cut to a new quantity and, for a sale, drawn from `lotIds` in that order (specific identification). */
export function recutLeg(accountId: string, leg: ProposedTradeLeg, cut: LegCut): { ok: true; leg: ProposedTradeLeg; sale: LegSale } | RecutFailure
```

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/handlers/__tests__/rebalance-preview-builder.test.ts
import { describe, it, expect } from 'vitest'
import { previewRebalance } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { buildRebalancePreviews, generateRebalanceProposal } from '@/mocks/handlers/oms'
import { MOCK_TODAY_ISO } from '@/lib/clock'

describe('buildRebalancePreviews', () => {
  it('serves exactly what the rebalance endpoint serves, batch netting included', async () => {
    const ids = ['acc-001', 'acc-002', 'acc-003', 'acc-005']
    const served = await previewRebalance({ accountIds: ids, taxAware: true })
    const built = buildRebalancePreviews(
      ids.map((id) => ({ account: accounts.find((a) => a.id === id)!, ...generateRebalanceProposal(id, true) })),
      true, undefined, MOCK_TODAY_ISO,
    )
    expect(JSON.parse(JSON.stringify(built))).toEqual(served)
  })

  it('acc-002 alone: the INTC loss nets against the joint return, and the estimate is the one Phase 0 pinned', () => {
    const account = accounts.find((a) => a.id === 'acc-002')!
    const [preview] = buildRebalancePreviews([{ account, ...generateRebalanceProposal('acc-002', true) }], true, 0.005, MOCK_TODAY_ISO)
    expect(preview!.estimatedTaxImpact).toBe(10_422)
    expect(preview!.grossTaxOnGains).toBe(29_128)
    expect(preview!.ytdRealisedOnReturn).toEqual({ shortTerm: 0, longTerm: -32_750, collectibleLongTerm: 0 })
    expect(preview!.trades.find((t) => t.symbol === 'INTC')?.repurchaseBlockedUntil).toBe('2026-03-27')
  })
})
```

```ts
// src/mocks/handlers/__tests__/recut-leg.test.ts
import { describe, it, expect } from 'vitest'
import { generateRebalanceTrades, recutLeg, type ProposedTradeLeg } from '@/mocks/handlers/oms'

const legs = generateRebalanceTrades('acc-002', true)
const leg = (symbol: string): ProposedTradeLeg => {
  const found = legs.find((l) => l.symbol === symbol)
  if (!found) throw new Error(`acc-002 proposes no ${symbol} leg`)
  return found
}
const cut = (symbol: string, quantity: number, lotIds?: string[]) => recutLeg('acc-002', leg(symbol), { quantity, lotIds })

describe('recutLeg', () => {
  it('re-cuts a sale to fewer shares and re-realises it lot by lot', () => {
    const r = cut('INTC', 3_000)
    if (!r.ok) throw new Error(r.message)
    expect(r.leg.quantity).toBe(3_000)
    expect(r.leg.estimatedValue).toBe(85_350)           // 3,000 × $28.45
    expect(r.leg.realisedLongTerm).toBe(-19_650)        // 3/7 of the lot's −$45,850
    expect(r.leg.realisedShortTerm).toBe(0)
    expect(r.sale.consumedLotIds).toEqual(['lot-pos-023-0'])
    expect(r.sale.soldLosses).toHaveLength(1)
  })

  it('specific identification moves SPY\'s gain from the long-term lot to the short-term lot and raises its tax', () => {
    const asGenerated = leg('SPY')
    const shortLot = cut('SPY', asGenerated.quantity, ['lot-pos-020-1'])
    if (!shortLot.ok) throw new Error(shortLot.message)
    expect(asGenerated.realisedLongTerm).toBeGreaterThan(0)
    expect(asGenerated.realisedShortTerm).toBe(0)
    expect(shortLot.leg.realisedLongTerm).toBe(0)
    expect(shortLot.leg.realisedShortTerm).toBeGreaterThan(0)
    expect(shortLot.leg.taxImpact).toBeGreaterThan(asGenerated.taxImpact)
    expect(shortLot.sale.consumedLotIds).toEqual(['lot-pos-020-1'])
  })

  it('re-cuts a purchase at the position\'s price', () => {
    const r = cut('EFA', 1_000)
    if (!r.ok) throw new Error(r.message)
    expect(r.leg.estimatedValue).toBe(82_300)           // 1,000 × $82.30
    expect(r.leg.realisedLongTerm).toBe(0)
    expect(r.sale.consumedLotIds).toEqual([])
  })

  it('a re-cut drops the settled wash-sale fields; the batch settles them again', () => {
    const r = recutLeg('acc-002', { ...leg('INTC'), repurchaseBlockedUntil: '2026-03-27' }, { quantity: 7_000 })
    if (!r.ok) throw new Error(r.message)
    expect(r.leg.repurchaseBlockedUntil).toBeUndefined()
    expect(r.leg.washedLoss).toBeUndefined()
  })

  it.each([
    ['INTC', 0, undefined, 'BAD_QUANTITY'],
    ['INTC', -5, undefined, 'BAD_QUANTITY'],
    ['INTC', Number.NaN, undefined, 'BAD_QUANTITY'],
    ['INTC', 1.5, undefined, 'BAD_QUANTITY'],
    ['INTC', 8_000, undefined, 'OVER_HELD'],
    ['INTC', 1_000, ['lot-pos-020-0'], 'LOT_NOT_IN_POSITION'],
    ['SPY', 2_000, ['lot-pos-020-0'], 'LOTS_TOO_SMALL'],
    ['EFA', 100, ['lot-pos-022-0'], 'LOTS_ON_BUY'],
  ] as const)('%s × %s with lots %j is refused with %s', (symbol, quantity, lotIds, code) => {
    const r = cut(symbol, quantity, lotIds ? [...lotIds] : undefined)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe(code)
      expect(r.message.length).toBeGreaterThan(0)
    }
  })
})
```

The pinned figures come from the fixtures: INTC is 7,000 shares at $28.45 in one long-term lot (`lot-pos-023-0`, −$45,850); SPY's lots `lot-pos-020-0` (1,515.33 sh, long-term) and `lot-pos-020-1` (2,363.67 sh, short-term) carry the same gain per share; EFA is $342,203.40 / 4,158 sh = $82.30.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/rebalance-preview-builder.test.ts src/mocks/handlers/__tests__/recut-leg.test.ts`
Expected: FAIL — `buildRebalancePreviews` and `recutLeg` are not exported.

- [ ] **Step 3: Split `realiseSale` so a caller can choose the lot order**

In `src/mocks/handlers/oms.ts`, replace `realiseSale` with the three functions below. Keep `realiseSale`'s existing doc comment above `realiseSale`; the loop body is unchanged.

```ts
/** Lots ordered for a tax-aware sale: least tax per dollar sold first, so losses go first, then the cheapest gains. */
function taxAwareLotOrder(lots: readonly CustodianLot[], symbol: string): CustodianLot[] {
  const character = taxCharacterOf(symbol)
  const taxPerDollar = (l: CustodianLot) => (l.gainLoss / l.currentValue) * taxRateFor(l.holdingPeriod, character)
  return [...lots].sort((a, b) => taxPerDollar(a) - taxPerDollar(b))
}

/** Realise a sale of `notional` drawn from `ordered` in exactly that order. */
function realiseOrderedLots(ordered: readonly CustodianLot[], symbol: string, notional: number): RealisedSale {
  if (ordered.length === 0 || notional <= 0) return NOTHING_REALISED
  // §0.6 · GLD's long-term gain is collectibles gain (31.8%), not 23.8%.
  const character = taxCharacterOf(symbol)
  const rateFor = (holdingPeriod: CustodianLot['holdingPeriod']) => taxRateFor(holdingPeriod, character)
  let remaining = notional
  let shortTerm = 0
  let longTerm = 0
  let tax = 0
  const consumedLotIds: string[] = []
  const soldLosses: SoldLossLot[] = []
  for (const lot of ordered) {
    if (remaining <= 0 || lot.currentValue <= 0) continue
    const portion = Math.min(1, remaining / lot.currentValue)
    consumedLotIds.push(lot.id)
    const realised = lot.gainLoss * portion
    if (lot.holdingPeriod === 'short') shortTerm += realised
    else longTerm += realised
    if (realised > 0) tax += realised * rateFor(lot.holdingPeriod)
    if (realised < 0) {
      soldLosses.push({
        lotId: lot.id, symbol, purchaseDate: lot.purchaseDate,
        quantity: lot.quantity * portion, loss: realised, holdingPeriod: lot.holdingPeriod,
      })
    }
    remaining -= lot.currentValue * portion
  }
  const roundedLongTerm = Math.round(longTerm)
  return {
    shortTerm: Math.round(shortTerm),
    longTerm: roundedLongTerm,
    collectibleLongTerm: character === 'collectible' ? roundedLongTerm : 0,
    tax: Math.max(0, Math.round(tax)),
    consumedLotIds,
    soldLosses,
  }
}

function realiseSale(accountLots: readonly CustodianLot[], target: Position, notional: number, taxAware: boolean): RealisedSale {
  const lots = accountLots.filter((l) => l.positionId === target.id)
  return realiseOrderedLots(taxAware ? taxAwareLotOrder(lots, target.symbol) : lots, target.symbol, notional)
}
```

The comment inside the old function about ranking by tax per dollar ("Minimise realised gain and rank by *tax per dollar sold* …") moves above `taxAwareLotOrder`.

- [ ] **Step 4: Add `recutLeg`**

Add after `holdingsAfterTrades`, with `import type { Account } from '@/types/account'` at the top of the file:

```ts
export type LegCut = { quantity: number; lotIds?: readonly string[] }
export type RecutFailure = {
  ok: false
  code: 'BAD_QUANTITY' | 'OVER_HELD' | 'LOT_NOT_IN_POSITION' | 'LOTS_TOO_SMALL' | 'LOTS_ON_BUY'
  message: string
}

/** The settled §1091 fields belong to a batch; a re-cut leg is settled again with the rest of its batch. */
const unsettled = ({ washedLoss: _washed, repurchaseBlockedUntil: _until, ...leg }: ProposedTradeLeg): ProposedTradeLeg => leg

/** What one unit of a leg's security costs in the account's currency: the held position's price, or the model security's. */
function unitPriceFor(account: Account, leg: ProposedTradeLeg, position: Position | undefined): number {
  if (position) return position.price
  const security = modelImplementationSecurity(computeDriftForAccount(account).modelId, leg.assetClass)
  if (!security) throw new Error(`recutLeg: no price for ${leg.symbol} in ${account.id}`)
  return convertCurrency(security.price, 'USD', currencyForAccount(account.id), FX_RATES_USD_BASE)
}

/**
 * Phase 3 · a workbench edit re-cut onto one leg. A sale is re-realised lot by lot: from `lotIds`
 * in the order given (specific identification) or, without them, in the generator's own tax-aware
 * order. A purchase is re-priced. The engine refuses what cannot be traded rather than clamping it.
 */
export function recutLeg(accountId: string, leg: ProposedTradeLeg, { quantity, lotIds }: LegCut): { ok: true; leg: ProposedTradeLeg; sale: LegSale } | RecutFailure {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`recutLeg: unknown account ${accountId}`)
  const wholeUnits = Number.isInteger(leg.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0 || (wholeUnits && !Number.isInteger(quantity))) {
    return { ok: false, code: 'BAD_QUANTITY', message: `${leg.symbol}: the quantity must be a positive ${wholeUnits ? 'whole number of shares' : 'number'}.` }
  }
  const position = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === leg.symbol && p.symbol !== 'CASH')
  const taxable = isTaxableAccount(account.taxTreatment)
  const ownLots = generateTaxLots(account.id, account.totalValue)
  const lossWindows = openWashSaleWindowsFor(account, MOCK_TODAY_ISO)
  const acquisitions = washSaleAcquisitions(account, (a) => (a.id === account.id ? ownLots : generateTaxLots(a.id, a.totalValue)))

  if (leg.side === 'buy') {
    if (lotIds) return { ok: false, code: 'LOTS_ON_BUY', message: `${leg.symbol}: lots are chosen for a sale, not a purchase.` }
    const estimatedValue = Math.round(quantity * unitPriceFor(account, leg, position))
    const washSaleRisk = hasWashSaleRisk({ symbol: leg.symbol, side: 'buy', realisesLoss: false, soldLotIds: [] }, lossWindows, acquisitions, MOCK_TODAY_ISO)
    return { ok: true, leg: { ...unsettled(leg), quantity, estimatedValue, washSaleRisk }, sale: { soldLosses: [], consumedLotIds: [] } }
  }

  if (!position) throw new Error(`recutLeg: ${accountId} sells ${leg.symbol} but holds none`)
  if (quantity > position.quantity) return { ok: false, code: 'OVER_HELD', message: `${leg.symbol}: the account holds fewer shares than that.` }
  const positionLots = ownLots.filter((l) => l.positionId === position.id)
  let ordered: CustodianLot[]
  if (lotIds) {
    const byId = new Map(positionLots.map((l) => [l.id, l]))
    const missing = lotIds.find((id) => !byId.has(id))
    if (missing !== undefined) return { ok: false, code: 'LOT_NOT_IN_POSITION', message: `${leg.symbol}: lot ${missing} is not part of this position.` }
    ordered = lotIds.flatMap((id) => byId.get(id) ?? [])
    const inLots = ordered.reduce((s, l) => s + l.quantity, 0)
    if (inLots + 1e-9 < quantity) return { ok: false, code: 'LOTS_TOO_SMALL', message: `${leg.symbol}: the chosen lots hold fewer shares than the sale.` }
  } else {
    ordered = taxable ? taxAwareLotOrder(positionLots, position.symbol) : positionLots
  }
  const estimatedValue = Math.round(quantity * position.price)
  const realised = taxable ? realiseOrderedLots(ordered, position.symbol, estimatedValue) : NOTHING_REALISED
  const trade: ProposedTradeLeg = {
    ...unsettled(leg),
    quantity,
    estimatedValue,
    taxImpact: realised.tax,
    realisedShortTerm: realised.shortTerm,
    realisedLongTerm: realised.longTerm,
    realisedCollectibleLongTerm: realised.collectibleLongTerm,
    washSaleRisk: hasWashSaleRisk(
      { symbol: leg.symbol, side: 'sell', realisesLoss: realised.shortTerm + realised.longTerm < 0, soldLotIds: realised.consumedLotIds },
      lossWindows, acquisitions, MOCK_TODAY_ISO,
    ),
  }
  return { ok: true, leg: trade, sale: { soldLosses: realised.soldLosses, consumedLotIds: realised.consumedLotIds } }
}
```

- [ ] **Step 5: Extract `buildRebalancePreviews` and use it in the handler**

Add above `omsHandlers`:

```ts
/** One account's entry in a preview batch. */
export type PreviewEntry = { account: Account } & RebalanceProposal

/**
 * The rebalance previews of a batch: §1091 settled across each wash-sale taxpayer's accounts, the
 * tax each proposal adds to its return netted against that return's year-to-date results (and
 * earlier accounts in the batch), the repurchase restrictions, and the drift after the trades. The
 * one assembly behind `/api/oms/rebalance` and every Phase 3 proposal version.
 */
export function buildRebalancePreviews(
  proposed: readonly PreviewEntry[],
  taxAware: boolean,
  driftThreshold: number | undefined,
  asOfISO: string,
): RebalancePreview[] {
  // §0.2 · §1091 across the batch: a buy here can wash a loss sold there, for one taxpayer.
  const settled = settleBatchWashSales(proposed, asOfISO)
  const batch = proposed.map(({ account }, i) => ({ account, legs: settled[i]! }))
  const estimates = estimateTaxOnReturns(batch, asOfISO)
  const proposals = batch.map(({ account, legs }) => ({ accountId: account.id, legs }))
  return batch.map(({ account, legs: trades }, i) => {
    const tax = estimates[i]!
    return {
      accountId: account.id,
      currency: currencyForAccount(account.id),
      trades,
      estimatedTaxImpact: tax.net,
      grossTaxOnGains: tax.gross,
      ytdRealisedOnReturn: tax.ytdRealisedOnReturn,
      nettedWithAccountIds: tax.nettedWithAccountIds,
      taxable: isTaxableAccount(account.taxTreatment),
      repurchaseRestrictions: repurchaseRestrictionsFor(account, asOfISO, proposals),
      projectedDrift: projectDrift(account.id, trades, taxAware, driftThreshold),
    }
  })
}
```

Move the handler's comments (§9.3 currency, §1222 netting, `taxable`) onto the matching lines here. The handler body becomes:

```ts
  http.post('/api/oms/rebalance', async ({ request }) => {
    const body = await request.json() as { accountIds: string[]; driftThreshold?: number; taxAware: boolean }
    const proposed: PreviewEntry[] = []
    for (const accountId of body.accountIds) {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) return notFound()
      // The Rebalance page's drift-threshold control was sent and ignored; `driftThreshold` was
      // in scope one line away.
      proposed.push({ account, ...generateRebalanceProposal(accountId, body.taxAware, body.driftThreshold) })
    }
    return HttpResponse.json(buildRebalancePreviews(proposed, body.taxAware, body.driftThreshold, MOCK_TODAY_ISO))
  }),
```

`projectDrift(id, trades, taxAware, undefined)` takes its default threshold, as before.

- [ ] **Step 6: Run the new tests and the engine suites that pin the old behaviour**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/rebalance-preview-builder.test.ts src/mocks/handlers/__tests__/recut-leg.test.ts src/mocks/handlers/__tests__/ src/mocks/data/__tests__/`
Expected: PASS, with no change to any existing test.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/handlers/oms.ts src/mocks/handlers/__tests__/rebalance-preview-builder.test.ts src/mocks/handlers/__tests__/recut-leg.test.ts
git commit -m "feat(engine): extract the rebalance preview builder; re-cut a leg lot by lot"
```

### Task 3: Constraint-aware generation

**Files:**
- Modify: `src/mocks/handlers/oms.ts`, `src/mocks/handlers/batch-wash-sales.ts`, `src/services/oms.ts`
- Test: `src/mocks/handlers/__tests__/constrained-generation.test.ts`

**Interfaces:**
- Consumes: Task 2's `buildRebalancePreviews`, `PreviewEntry`, `realiseOrderedLots`, `taxAwareLotOrder`.
- Produces:

```ts
// src/services/oms.ts
export type ResidualDriftReason =
  | 'not_market_tradable' | 'cash_capped' | 'replacement_hold' | 'below_lot_size'
  | 'excluded_by_constraint' | 'harvest_only' | 'gains_capped' | 'wash_sale_avoided'

// src/mocks/handlers/oms.ts
export type GenerationConstraints = {
  harvestOnly?: boolean
  capRealisedGains?: number
  excludeAssetClasses?: readonly AssetClass[]
  avoidSelfWash?: boolean
}
export type RebalanceProposal = {
  legs: ProposedTradeLeg[]
  sales: ReadonlyMap<ProposedTradeLeg, LegSale>
  /** Asset classes a constraint held away from target, with the constraint that did it. */
  heldBack: ReadonlyMap<AssetClass, ResidualDriftReason>
}
export function generateRebalanceProposal(accountId: string, taxAware: boolean, driftThreshold?: number, modelId?: string, constraints?: GenerationConstraints): RebalanceProposal
export function projectDrift(accountId: string, legs: readonly ProposedTradeLeg[], taxAware: boolean, driftThreshold?: number, modelId?: string, heldBack?: ReadonlyMap<AssetClass, ResidualDriftReason>): ProjectedDrift
/** Gains realised by these legs, gain legs only: Σ max(0, short-term) + max(0, long-term). */
export function realisedGains(legs: readonly Pick<ProposedTrade, 'realisedShortTerm' | 'realisedLongTerm'>[]): number
/** Symbols a purchase must not be: open loss windows of the taxpayer, and symbols this proposal sells at a loss. Coins held directly are outside §1091. */
export function washingSymbols(openWindows: readonly { symbol: string }[], lossSoldSymbols: readonly string[]): Set<string>
```

Semantics (from the spec): `harvest_only` sells only loss lots of positions below cost, and keeps the buys those sales and the cash above target can fund; a tax-advantaged account has no loss to harvest and sells nothing. `cap_realised_gains` trims gain legs, the highest gain per dollar first ("highest gain per dollar last" to be realised), until realised gains are at or under the cap. `exclude_asset_class` leaves a class untouched. `avoid_self_wash` never proposes a buy that would wash one of the proposal's own loss sales or an open loss sale of the same wash-sale taxpayer in any of their accounts.

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/handlers/__tests__/constrained-generation.test.ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { openWashSaleWindowsFor } from '@/mocks/handlers/tax-return'
import { settleBatchWashSales } from '@/mocks/handlers/batch-wash-sales'
import { buildRebalancePreviews, generateRebalanceProposal, realisedGains, washingSymbols, type GenerationConstraints } from '@/mocks/handlers/oms'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { MOCK_TODAY_ISO } from '@/lib/clock'

const account = (id: string) => accounts.find((a) => a.id === id)!
const generate = (id: string, constraints: GenerationConstraints) => generateRebalanceProposal(id, true, 0.005, undefined, constraints)
const settled = (id: string, constraints: GenerationConstraints) => settleBatchWashSales([{ account: account(id), ...generate(id, constraints) }], MOCK_TODAY_ISO)[0]!

describe('no constraints', () => {
  it.each(accounts.map((a) => a.id))('%s: nothing is held back and the legs are the unconstrained ones', (id) => {
    const plain = generateRebalanceProposal(id, true)
    const empty = generate(id, {})
    expect(empty.heldBack.size).toBe(0)
    expect(empty.legs).toEqual(plain.legs)
  })
})

describe('harvest only', () => {
  it.each(accounts.map((a) => a.id))('%s: every sale draws only on loss lots; a tax-advantaged account sells nothing', (id) => {
    const a = account(id)
    const proposal = generate(id, { harvestOnly: true })
    const lossLots = new Set(generateTaxLots(a.id, a.totalValue).filter((l) => l.gainLoss < 0).map((l) => l.id))
    for (const leg of proposal.legs.filter((l) => l.side === 'sell')) {
      expect(isTaxableAccount(a.taxTreatment)).toBe(true)
      expect(leg.realisedShortTerm).toBeLessThanOrEqual(0)
      expect(leg.realisedLongTerm).toBeLessThanOrEqual(0)
      for (const lotId of proposal.sales.get(leg)?.consumedLotIds ?? []) expect(lossLots.has(lotId)).toBe(true)
    }
  })

  it('acc-002 sells exactly its 7,000 INTC and holds US Equity and Digital Assets back for harvest only', () => {
    const proposal = generate('acc-002', { harvestOnly: true })
    const sells = proposal.legs.filter((l) => l.side === 'sell')
    expect(sells.map((l) => [l.symbol, l.quantity])).toEqual([['INTC', 7_000]])
    expect(proposal.heldBack.get('us_equity')).toBe('harvest_only')
    expect(proposal.heldBack.get('digital_assets')).toBe('harvest_only')
    expect(proposal.heldBack.has('private_equity')).toBe(false)
    expect(proposal.legs.some((l) => l.side === 'buy')).toBe(true)
  })

  it('acc-002: the projected drift names harvest only as the reason US Equity stays out', () => {
    const [preview] = buildRebalancePreviews([{ account: account('acc-002'), ...generate('acc-002', { harvestOnly: true }) }], true, 0.005, MOCK_TODAY_ISO)
    const usEquity = preview!.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!
    expect(usEquity.residualReason).toBe('harvest_only')
    const privateEquity = preview!.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    expect(privateEquity.residualReason).toBe('not_market_tradable')
  })
})

describe('excluding an asset class', () => {
  it.each(accounts.map((a) => a.id))('%s: no leg trades the excluded class, which is reported as held back', (id) => {
    const first = generateRebalanceProposal(id, true).legs[0]
    if (!first) return
    const proposal = generate(id, { excludeAssetClasses: [first.assetClass] })
    expect(proposal.legs.some((l) => l.assetClass === first.assetClass)).toBe(false)
    expect(proposal.heldBack.get(first.assetClass)).toBe('excluded_by_constraint')
  })

  it('acc-002 without digital assets keeps its ETHE and IBIT', () => {
    const symbols = generate('acc-002', { excludeAssetClasses: ['digital_assets'] }).legs.map((l) => l.symbol)
    expect(symbols).not.toContain('ETHE')
    expect(symbols).not.toContain('IBIT')
    expect(symbols).toContain('INTC')
  })
})

describe('capping realised gains', () => {
  it('acc-002 under a $50,000 cap realises at most $50,000 of gains, trimming IBIT (highest gain per dollar) first', () => {
    const uncapped = generate('acc-002', {})
    const capped = generate('acc-002', { capRealisedGains: 50_000 })
    expect(realisedGains(uncapped.legs)).toBeGreaterThan(50_000)
    expect(realisedGains(capped.legs)).toBeLessThanOrEqual(50_000)
    expect(realisedGains(capped.legs)).toBeGreaterThan(0)
    const ibit = capped.legs.find((l) => l.symbol === 'IBIT')
    const uncappedIbit = uncapped.legs.find((l) => l.symbol === 'IBIT')!
    expect(ibit === undefined || ibit.quantity < uncappedIbit.quantity).toBe(true)
    expect(capped.legs.find((l) => l.symbol === 'INTC')?.quantity).toBe(7_000)
    expect(capped.heldBack.size).toBeGreaterThan(0)
  })

  it.each(accounts.map((a) => a.id))('%s: a zero cap realises no gain at all', (id) => {
    expect(realisedGains(generate(id, { capRealisedGains: 0 }).legs)).toBe(0)
  })
})

describe('avoiding self-washing buys', () => {
  it('the couple\'s open INTC window makes INTC unbuyable in every account of that taxpayer, and in no other household', () => {
    for (const id of ['acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005']) {
      expect(washingSymbols(openWashSaleWindowsFor(account(id), MOCK_TODAY_ISO), []).has('INTC')).toBe(true)
    }
    expect(washingSymbols(openWashSaleWindowsFor(account('acc-006'), MOCK_TODAY_ISO), []).has('INTC')).toBe(false)
  })

  it('a symbol sold at a loss is unbuyable, and a coin held directly never is', () => {
    expect([...washingSymbols([], ['AGG', 'ETH'])]).toEqual(['AGG'])
  })

  it.each(accounts.map((a) => a.id))('%s: with the constraint on, no buy carries a wash-sale risk after settlement', (id) => {
    for (const leg of settled(id, { avoidSelfWash: true }).filter((l) => l.side === 'buy')) expect(leg.washSaleRisk).toBe(false)
  })

  it.each(accounts.map((a) => a.id))('%s: no buy names a symbol the proposal sells at a loss', (id) => {
    const a = account(id)
    const positions = getPositionsForAccount(a.id, a.totalValue)
    const legs = generate(id, { avoidSelfWash: true, harvestOnly: true }).legs
    const lossSold = new Set(legs.filter((l) => l.side === 'sell' && (positions.find((p) => p.symbol === l.symbol)?.gainLoss ?? 0) < 0).map((l) => l.symbol))
    for (const leg of legs.filter((l) => l.side === 'buy')) expect(lossSold.has(leg.symbol)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/constrained-generation.test.ts`
Expected: FAIL — `realisedGains` / `washingSymbols` are not exported; `heldBack` is undefined.

- [ ] **Step 3: Widen the residual reasons and the batch entry**

`src/services/oms.ts`:

```ts
/**
 * Why an asset class is still away from target after the proposed trades. The last four are a
 * Phase 3 proposal constraint (or a workbench exclusion) holding the class back.
 */
export type ResidualDriftReason =
  | 'not_market_tradable' | 'cash_capped' | 'replacement_hold' | 'below_lot_size'
  | 'excluded_by_constraint' | 'harvest_only' | 'gains_capped' | 'wash_sale_avoided'
```

`src/mocks/handlers/batch-wash-sales.ts`: `type BatchEntry = { account: Account } & Pick<RebalanceProposal, 'legs' | 'sales'>` (settlement needs only the legs and what they sell).

- [ ] **Step 4: Add the constraint helpers to `oms.ts`**

Imports to add: `import type { AssetClass } from '@/types/portfolio'`, `isSubjectToWashSale` from `@/lib/security-master`, and `type ProposedTrade` is already imported from `@/services/oms`.

```ts
/** Phase 3 · constraints a proposal is generated under. All optional; `{}` is the unconstrained generator. */
export type GenerationConstraints = {
  /** Sell only loss lots of positions below cost. Tax-advantaged accounts have no loss to harvest and sell nothing. */
  harvestOnly?: boolean
  /** Upper bound on realised gains (gain legs only, losses not netted), in the account's currency. */
  capRealisedGains?: number
  /** Asset classes the proposal leaves untouched. */
  excludeAssetClasses?: readonly AssetClass[]
  /** Never buy a symbol whose purchase would wash a loss of the same wash-sale taxpayer. */
  avoidSelfWash?: boolean
}

const legGain = (l: Pick<ProposedTrade, 'realisedShortTerm' | 'realisedLongTerm'>) =>
  Math.max(0, l.realisedShortTerm) + Math.max(0, l.realisedLongTerm)

export function realisedGains(legs: readonly Pick<ProposedTrade, 'realisedShortTerm' | 'realisedLongTerm'>[]): number {
  return legs.reduce((s, l) => s + legGain(l), 0)
}

/**
 * IRC §1091 · the symbols a purchase must not be: every symbol with an open loss-sale window of the
 * account's wash-sale taxpayer (owner and spouse, their IRAs and Roths included —
 * `openWashSaleWindowsFor`), and every symbol this proposal itself sells at a loss. A coin held
 * directly is outside §1091 and is never on the list.
 */
export function washingSymbols(openWindows: readonly { symbol: string }[], lossSoldSymbols: readonly string[]): Set<string> {
  return new Set([...openWindows.map((w) => w.symbol), ...lossSoldSymbols].filter(isSubjectToWashSale))
}

/** Market value of `position`'s lots that stand at a loss: all a harvest of it may sell. */
function lossLotValue(lots: readonly CustodianLot[], position: Position): number {
  return lots.filter((l) => l.positionId === position.id && l.gainLoss < 0).reduce((s, l) => s + l.currentValue, 0)
}

/** How many times the gain cap may re-cut the top gain leg before the engine refuses (each pass is a full cash-band resolution). */
const MAX_GAIN_CAP_PASSES = 32
```

`RebalanceProposal` gains `heldBack` as in **Interfaces**.

- [ ] **Step 5: Restructure `generateRebalanceProposal`**

The function keeps every existing comment block; each moves with the code it describes. Its new shape:

```ts
export function generateRebalanceProposal(
  accountId: string,
  taxAware: boolean,
  driftThreshold = 0.005,
  modelId?: string,
  constraints: GenerationConstraints = {},
): RebalanceProposal {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return { legs: [], sales: new Map(), heldBack: new Map() }
  const positions = getPositionsForAccount(account.id, account.totalValue)
  const drift = computeDriftForAccount(account, modelId)
  const taxable = isTaxableAccount(account.taxTreatment)
  const currency = currencyForAccount(accountId)
  const lossWindows = openWashSaleWindowsFor(account, MOCK_TODAY_ISO)
  const ownLots = generateTaxLots(account.id, account.totalValue)
  const recentlyOpened = recentlyOpenedPositions(ownLots, MOCK_TODAY_ISO)
  const acquisitions = washSaleAcquisitions(account, (a) => (a.id === account.id ? ownLots : generateTaxLots(a.id, a.totalValue)))
  const harvestOnly = constraints.harvestOnly === true
  // A harvest sells loss lots first whatever the toggle says; that is what makes it a harvest.
  const lotOrderTaxAware = taxAware || harvestOnly
  const excluded = new Set<AssetClass>(constraints.excludeAssetClasses ?? [])
  const heldBack = new Map<AssetClass, ResidualDriftReason>()
  const lossValueOf = (p: Position) => lossLotValue(ownLots, p)

  type RawLeg = { target: TradeCandidate; side: 'buy' | 'sell'; notional: number; sleeve: Sleeve }

  const drafted = drift.assetClassDrifts
    .filter((d) => Math.abs(d.drift) > driftThreshold)
    .flatMap((d): RawLeg[] => {
      if (excluded.has(d.assetClass)) {
        heldBack.set(d.assetClass, 'excluded_by_constraint')
        return []
      }
      const held = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
      const side: 'buy' | 'sell' = d.actual > d.target ? 'sell' : 'buy'
      const rawNotional = Math.abs(d.drift) * account.totalValue
      const sleeve: Sleeve = { assetClass: d.assetClass, actualWeight: d.actual, targetWeight: d.target }

      if (side === 'sell') {
        const ordered = orderSellCandidates(held, taxAware && taxable, recentlyOpened)
        const candidates = harvestOnly ? (taxable ? ordered.filter((p) => lossValueOf(p) > 0) : []) : ordered
        let remaining = rawNotional
        const legs: RawLeg[] = []
        for (const position of candidates) {
          if (remaining <= 0) break
          const notional = Math.min(remaining, harvestOnly ? lossValueOf(position) : position.marketValue)
          if (notional <= 0) continue
          legs.push({ target: { symbol: position.symbol, name: position.name, price: position.price, position }, side, notional, sleeve })
          remaining -= notional
        }
        // Held back for the harvest only when the constraint filtered out a position that could have sold.
        if (harvestOnly && remaining > 0 && candidates.length < ordered.length) heldBack.set(d.assetClass, 'harvest_only')
        return legs
      }

      const target = pickBuyCandidate(held, drift.modelId, d.assetClass, currency)
      if (!target) return []
      return [{ target, side, notional: rawNotional, sleeve }]
    })

  const lossSold = taxable
    ? drafted.filter((l) => l.side === 'sell' && l.target.position !== undefined && lossValueOf(l.target.position) > 0).map((l) => l.target.symbol)
    : []
  const washing = constraints.avoidSelfWash ? washingSymbols(lossWindows, lossSold) : new Set<string>()
  const raw = drafted.filter((leg) => {
    if (leg.side !== 'buy' || !washing.has(leg.target.symbol)) return true
    heldBack.set(leg.sleeve.assetClass, 'wash_sale_avoided')
    return false
  })

  const cashDrift = drift.assetClassDrifts.find((d) => d.assetClass === 'cash')
  const cashValue = positions.find((p) => p.symbol === 'CASH')?.marketValue ?? account.cashBalance
  const cashTargetValue = (cashDrift?.target ?? 0) * account.totalValue
  const cashHeadroom = Math.max(0, cashTargetValue - cashValue)
  const cashAboveTarget = Math.max(0, cashValue - cashTargetValue)

  type Resolved = { legs: ProposedTradeLeg[]; sales: Map<ProposedTradeLeg, LegSale>; rawOf: Map<ProposedTradeLeg, RawLeg> }

  /** Executable legs for `rawLegs`, resolved onto the cash band. */
  const resolve = (rawLegs: readonly RawLeg[]): Resolved => {
    const sales = new Map<ProposedTradeLeg, LegSale>()
    const totalSell = rawLegs.filter((t) => t.side === 'sell').reduce((s, t) => s + t.notional, 0)
    const totalBuy = rawLegs.filter((t) => t.side === 'buy').reduce((s, t) => s + t.notional, 0)
    // `toTrade`, `built`, `build`, `buyScaleFor`, `sellScaleFor`, `withinCashBand`, the MAX_PASSES
    // loop and the post-loop band assertion: the existing code, verbatim, with these three changes:
    //  - every `raw` becomes `rawLegs`;
    //  - `toTrade` calls `realiseSale(ownLots, target.position, estimatedValue, lotOrderTaxAware)`;
    //  - `toTrade` writes to this function's own `sales` map.
    const legs = rawLegs.map((leg) => built.get(leg)).filter((t): t is ProposedTradeLeg => t !== undefined)
    return { legs, sales, rawOf: new Map([...built].map(([rawLeg, trade]) => [trade, rawLeg])) }
  }

  let current: readonly RawLeg[] = raw
  let resolved = resolve(current)
  const cap = constraints.capRealisedGains
  if (cap !== undefined) {
    // Trim the gain leg with the most gain per dollar first, re-resolving the cash band each pass:
    // the gains realised last are the ones a cap gives up first.
    for (let pass = 0; pass < MAX_GAIN_CAP_PASSES && realisedGains(resolved.legs) > cap; pass++) {
      const top = resolved.legs
        .filter((l) => l.side === 'sell' && legGain(l) > 0)
        .sort((a, b) => legGain(b) / b.estimatedValue - legGain(a) / a.estimatedValue)[0]
      const source = top === undefined ? undefined : resolved.rawOf.get(top)
      if (!top || !source) break
      heldBack.set(source.sleeve.assetClass, 'gains_capped')
      const cut = (realisedGains(resolved.legs) - cap) / (legGain(top) / top.estimatedValue)
      const notional = top.estimatedValue - cut
      current = current.flatMap((leg) => (leg !== source ? [leg] : notional > 0 ? [{ ...leg, notional }] : []))
      resolved = resolve(current)
    }
    if (realisedGains(resolved.legs) > cap) {
      throw new Error(`gain cap resolution did not reach ${cap} for ${account.id}: refusing to propose gains past the cap`)
    }
  }
  return { legs: resolved.legs, sales: resolved.sales, heldBack }
}
```

Write the elided part of `resolve` out in full from the existing function (lines from `const toTrade = ...` to the `throw new Error('rebalance cap resolution …')` block); the cash figures (`cashDrift` … `cashAboveTarget`) now sit above `resolve` because they do not depend on the legs. `generateRebalanceTrades` is unchanged (`.legs`).

- [ ] **Step 6: Carry `heldBack` into the projected drift**

`projectDrift` gains a sixth parameter and lets a constraint name the reason:

```ts
export function projectDrift(
  accountId: string,
  legs: readonly ProposedTradeLeg[],
  taxAware: boolean,
  driftThreshold = 0.005,
  modelId?: string,
  heldBack: ReadonlyMap<AssetClass, ResidualDriftReason> = new Map(),
): ProjectedDrift {
  // … unchanged down to the return …
    assetClassDrifts: after.assetClassDrifts.map((d) => (
      d.assetClass !== 'cash' && Math.abs(d.drift) > driftThreshold
        ? { ...d, residualReason: heldBack.get(d.assetClass) ?? residualReason(factsFor(d.assetClass, d.drift)) }
        : { ...d }
    )),
```

In `buildRebalancePreviews` pass it: `projectedDrift: projectDrift(account.id, trades, taxAware, driftThreshold, undefined, proposed[i]!.heldBack)`.

- [ ] **Step 7: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/constrained-generation.test.ts src/mocks/handlers/__tests__/ src/mocks/data/__tests__/`
Expected: PASS. The whole-book suites (`model-trade-invariants`, `projected-drift`, `loss-sale-window`, cash-band sweeps) prove the unconstrained generator is unchanged.

- [ ] **Step 8: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/handlers/oms.ts src/mocks/handlers/batch-wash-sales.ts src/services/oms.ts src/mocks/handlers/__tests__/constrained-generation.test.ts
git commit -m "feat(engine): constraint-aware rebalance generation — harvest only, gain cap, excluded classes, no self-washing buys"
```

### Task 4: The version builder

A version is a pure function of `(account, constraints, edits)`: generate under the constraints, apply the edits on top of the agent's legs, build the preview, run the proposal-level pre-trade check, and fingerprint the result. Saving, revising and previewing (Task 7) all go through `buildVersion`, so "each version's preview equals a fresh engine run on its legs" holds by construction and is tested here.

**Files:**
- Create: `src/mocks/workspace/proposal-engine.ts`
- Test: `src/mocks/workspace/__tests__/proposal-engine.test.ts`

**Interfaces:**
- Consumes: Task 1 types; Task 2/3 `generateRebalanceProposal`, `buildRebalancePreviews`, `recutLeg`, `realisedGains`, `GenerationConstraints`, `RebalanceProposal`, `ProposedTradeLeg`; `evaluateProposal` (`compliance.ts`); `fingerprint` (`@/lib/fingerprint`); `claimNameOf` (`@/mocks/agents/claim-name`).
- Produces:

```ts
// src/mocks/workspace/proposal-engine.ts
export const PROPOSAL_DRIFT_THRESHOLD = 0.005
export type EngineFailure = { ok: false; code: string; message: string }
export function parseConstraints(value: unknown): { ok: true; value: ProposalConstraint[] } | EngineFailure
export function parseEdits(value: unknown): { ok: true; value: LegEdit[] } | EngineFailure
export function normaliseConstraints(constraints: readonly ProposalConstraint[]): ProposalConstraint[]
export function normaliseEdits(edits: readonly LegEdit[]): LegEdit[]
export function generationConstraintsOf(constraints: readonly ProposalConstraint[]): GenerationConstraints
export function applyEdits(accountId: string, base: RebalanceProposal, edits: readonly LegEdit[]): { ok: true; proposal: RebalanceProposal; excludedLegs: ExcludedLeg[] } | EngineFailure
export function buildVersion(accountId: string, constraints: readonly ProposalConstraint[], edits: readonly LegEdit[]): { ok: true; built: DraftPreview; names: ReadonlyMap<string, string> } | EngineFailure
export function taxSummaryOf(preview: RebalancePreview): ProposalTaxSummary
/** Digit-free: what a workbench version changed, naming securities without digits. */
export function editSummary(edits: readonly LegEdit[], names: ReadonlyMap<string, string>): string
```

`buildVersion`'s `names` maps each generated leg's symbol to its security name (for summaries).

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/workspace/__tests__/proposal-engine.test.ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import type { LegEdit, ProposalConstraint } from '@/types/workspace-proposal'
import { applyEdits, buildVersion, editSummary, normaliseConstraints, parseConstraints, parseEdits } from '../proposal-engine'
import { generateRebalanceProposal } from '@/mocks/handlers/oms'

const AGENT: ProposalConstraint[] = [{ kind: 'avoid_self_wash' }]
const built = (constraints: ProposalConstraint[], edits: LegEdit[] = []) => {
  const r = buildVersion('acc-002', constraints, edits)
  if (!r.ok) throw new Error(r.message)
  return r.built
}

describe('buildVersion · acc-002', () => {
  it('v1 is the tax-aware rebalance Phase 0 pinned, with its tax summary from the engine', () => {
    const v = built(AGENT)
    expect(v.preview.trades.map((t) => [t.symbol, t.side, t.quantity])).toEqual([
      ['INTC', 'sell', 7_000], ['SPY', 'sell', 758], ['EFA', 'buy', 3_578], ['VWO', 'buy', 4_441], ['AGG', 'buy', 1_567],
      ['QAI', 'buy', 5_652], ['GLD', 'buy', 369], ['ETHE', 'sell', 3_882], ['IBIT', 'sell', 3_234],
    ])
    expect(v.summary).toEqual({
      sold: 835_915, bought: 926_282, gains: 122_388, losses: -45_850, netShortTerm: 0, netLongTerm: 76_538, washed: 0, grossTax: 29_128, netTax: 10_422,
    })
    expect(v.pretrade.passed).toBe(true)
    expect(v.pretrade.violations.map((x) => [x.category, x.symbol, x.severity])).toEqual([['concentration_limit', 'SPY', 'warning']])
    expect(v.legFacts.find((f) => f.symbol === 'INTC')).toEqual({ symbol: 'INTC', lotIds: ['lot-pos-023-0'], washed: 0 })
    expect(v.excludedLegs).toEqual([])
  })

  it('a version equals a fresh engine run on the same inputs', () => {
    const edits: LegEdit[] = [{ kind: 'exclude', symbol: 'QAI' }, { kind: 'quantity', symbol: 'INTC', quantity: 6_000 }]
    expect(built([{ kind: 'harvest_only' }, ...AGENT], edits)).toEqual(built([...AGENT, { kind: 'harvest_only' }], [...edits].reverse()))
  })

  it('the fingerprint changes with any constraint, edit, quantity or lot, and only then', () => {
    const base = built(AGENT).fingerprint
    expect(built(AGENT).fingerprint).toBe(base)
    const variants = [
      built([...AGENT, { kind: 'harvest_only' }]),
      built(AGENT, [{ kind: 'exclude', symbol: 'QAI' }]),
      built(AGENT, [{ kind: 'quantity', symbol: 'SPY', quantity: 700 }]),
      built(AGENT, [{ kind: 'lots', symbol: 'SPY', lotIds: ['lot-pos-020-1'] }]),
    ].map((v) => v.fingerprint)
    expect(new Set([base, ...variants]).size).toBe(5)
    for (const fp of variants) expect(fp).toMatch(/^[0-9A-F]{8}$/)
  })

  it('an excluded leg is listed with the figures the agent proposed, and its class is held back', () => {
    const v = built(AGENT, [{ kind: 'exclude', symbol: 'QAI' }])
    expect(v.preview.trades.some((t) => t.symbol === 'QAI')).toBe(false)
    expect(v.excludedLegs).toEqual([{ symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', side: 'buy', quantity: 5_652, estimatedValue: 198_950 }])
    expect(v.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'alternatives')?.residualReason).toBe('excluded_by_constraint')
  })

  it('specific lots for SPY change its character on the tape', () => {
    const v = built(AGENT, [{ kind: 'lots', symbol: 'SPY', lotIds: ['lot-pos-020-1'] }])
    expect(v.summary.netShortTerm).toBeGreaterThan(0)
    expect(v.legFacts.find((f) => f.symbol === 'SPY')?.lotIds).toEqual(['lot-pos-020-1'])
  })

  it('a quantity that drains cash below zero is a pre-trade block, reported, not refused', () => {
    const v = built(AGENT, [{ kind: 'quantity', symbol: 'VWO', quantity: 100_000 }])
    expect(v.pretrade.violations.some((x) => x.severity === 'block')).toBe(true)
  })
})

describe('edits are re-validated by the engine', () => {
  it.each([
    [[{ kind: 'exclude', symbol: 'MSFT' }], 'NOT_A_LEG'],
    [[{ kind: 'quantity', symbol: 'INTC', quantity: 0 }], 'BAD_QUANTITY'],
    [[{ kind: 'quantity', symbol: 'INTC', quantity: 9_000 }], 'OVER_HELD'],
    [[{ kind: 'lots', symbol: 'INTC', lotIds: ['lot-pos-020-0'] }], 'LOT_NOT_IN_POSITION'],
    [[{ kind: 'exclude', symbol: 'QAI' }, { kind: 'exclude', symbol: 'QAI' }], 'DUPLICATE_EDIT'],
  ] as const)('%j → %s', (edits, code) => {
    const r = buildVersion('acc-002', AGENT, edits.map((e) => ({ ...e })) as LegEdit[])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(code)
  })

  it('applyEdits leaves an unedited leg as the same object', () => {
    const base = generateRebalanceProposal('acc-002', true, 0.005, undefined, { avoidSelfWash: true })
    const r = applyEdits('acc-002', base, [{ kind: 'exclude', symbol: 'QAI' }])
    if (!r.ok) throw new Error(r.message)
    expect(r.proposal.legs[0]).toBe(base.legs[0])
  })
})

describe('parsing request bodies', () => {
  it.each([
    [undefined], [{}], [[{ kind: 'nope' }]], [[{ kind: 'cap_realised_gains', usd: -1 }]], [[{ kind: 'cap_realised_gains', usd: 'lots' }]],
    [[{ kind: 'exclude_asset_class', assetClass: 'gold' }]],
  ])('refuses constraints %j', (value) => expect(parseConstraints(value).ok).toBe(false))

  it('accepts and normalises constraints', () => {
    const r = parseConstraints([{ kind: 'exclude_asset_class', assetClass: 'digital_assets' }, { kind: 'harvest_only' }, { kind: 'harvest_only' }])
    if (!r.ok) throw new Error(r.message)
    expect(normaliseConstraints(r.value)).toEqual([{ kind: 'harvest_only' }, { kind: 'exclude_asset_class', assetClass: 'digital_assets' }])
  })

  it.each([
    [undefined], [[{ kind: 'quantity', symbol: 'INTC' }]], [[{ kind: 'quantity', symbol: '', quantity: 1 }]],
    [[{ kind: 'lots', symbol: 'INTC', lotIds: [] }]], [[{ kind: 'lots', symbol: 'INTC', lotIds: [3] }]], [[{ kind: 'rename', symbol: 'INTC' }]],
  ])('refuses edits %j', (value) => expect(parseEdits(value).ok).toBe(false))
})

describe('editSummary', () => {
  const names = new Map([['SPY', 'SPDR S&P 500 ETF'], ['INTC', 'Intel Corp.'], ['QAI', 'IQ Hedge Multi-Strategy Tracker ETF']])
  it('names what changed without a digit', () => {
    const text = editSummary([{ kind: 'quantity', symbol: 'SPY', quantity: 700 }, { kind: 'exclude', symbol: 'QAI' }, { kind: 'lots', symbol: 'INTC', lotIds: ['lot-pos-023-0'] }], names)
    expect(text).toBe('Workbench edits: chose specific lots for Intel Corp.; excluded IQ Hedge Multi-Strategy Tracker ETF; set the SPY quantity.')
    expect(text).not.toMatch(/\d/)
  })
  it('says so when the edits are cleared', () => expect(editSummary([], names)).toBe("Back to the agent's legs, with no workbench edits."))
})

describe('every account', () => {
  it.each(accounts.map((a) => a.id))('%s: the agent version builds, and no two legs share a symbol', (id) => {
    const r = buildVersion(id, AGENT, [])
    if (!r.ok) throw new Error(r.message)
    const symbols = r.built.preview.trades.map((t) => t.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/workspace/__tests__/proposal-engine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/mocks/workspace/proposal-engine.ts
import type { AssetClass } from '@/types/portfolio'
import type { ProposedTrade, RebalancePreview } from '@/services/oms'
import type { DraftPreview, ExcludedLeg, LegEdit, LegFacts, ProposalConstraint, ProposalTaxSummary } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import type { LegSale } from '@/mocks/handlers/batch-wash-sales'
import {
  buildRebalancePreviews, generateRebalanceProposal, realisedGains, recutLeg,
  type GenerationConstraints, type ProposedTradeLeg, type RebalanceProposal,
} from '@/mocks/handlers/oms'
import { claimNameOf } from '@/mocks/agents/claim-name'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { fingerprint } from '@/lib/fingerprint'

/** Proposals are generated tax-aware against the drift surface's own threshold. */
export const PROPOSAL_DRIFT_THRESHOLD = 0.005

export type EngineFailure = { ok: false; code: string; message: string }
const fail = (code: string, message: string): EngineFailure => ({ ok: false, code, message })

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isAssetClass = (v: unknown): v is AssetClass => typeof v === 'string' && Object.prototype.hasOwnProperty.call(ASSET_CLASS_LABELS, v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export function parseConstraints(value: unknown): { ok: true; value: ProposalConstraint[] } | EngineFailure {
  if (!Array.isArray(value)) return fail('BAD_CONSTRAINTS', 'constraints must be a list.')
  const out: ProposalConstraint[] = []
  for (const item of value) {
    if (!isRecord(item)) return fail('BAD_CONSTRAINTS', 'Each constraint must be an object.')
    switch (item.kind) {
      case 'harvest_only':
      case 'avoid_self_wash':
        out.push({ kind: item.kind })
        break
      case 'cap_realised_gains':
        if (typeof item.usd !== 'number' || !Number.isFinite(item.usd) || item.usd < 0) return fail('BAD_CONSTRAINTS', 'A gains cap must be zero or a positive amount.')
        out.push({ kind: 'cap_realised_gains', usd: item.usd })
        break
      case 'exclude_asset_class':
        if (!isAssetClass(item.assetClass)) return fail('BAD_CONSTRAINTS', 'That is not an asset class.')
        out.push({ kind: 'exclude_asset_class', assetClass: item.assetClass })
        break
      default:
        return fail('BAD_CONSTRAINTS', 'Unknown constraint.')
    }
  }
  return { ok: true, value: out }
}

export function parseEdits(value: unknown): { ok: true; value: LegEdit[] } | EngineFailure {
  if (!Array.isArray(value)) return fail('BAD_EDITS', 'edits must be a list.')
  const out: LegEdit[] = []
  for (const item of value) {
    if (!isRecord(item) || !nonEmpty(item.symbol)) return fail('BAD_EDITS', 'Each edit names a symbol.')
    const symbol = item.symbol
    switch (item.kind) {
      case 'exclude':
        out.push({ kind: 'exclude', symbol })
        break
      case 'quantity':
        if (typeof item.quantity !== 'number') return fail('BAD_EDITS', `${symbol}: the quantity must be a number.`)
        out.push({ kind: 'quantity', symbol, quantity: item.quantity })
        break
      case 'lots':
        if (!Array.isArray(item.lotIds) || item.lotIds.length === 0 || !item.lotIds.every(nonEmpty)) return fail('BAD_EDITS', `${symbol}: choose at least one lot.`)
        out.push({ kind: 'lots', symbol, lotIds: item.lotIds.filter(nonEmpty) })
        break
      default:
        return fail('BAD_EDITS', 'Unknown edit.')
    }
  }
  return { ok: true, value: out }
}

const CONSTRAINT_ORDER: Readonly<Record<ProposalConstraint['kind'], number>> = { avoid_self_wash: 0, harvest_only: 1, cap_realised_gains: 2, exclude_asset_class: 3 }
const EDIT_ORDER: Readonly<Record<LegEdit['kind'], number>> = { exclude: 0, quantity: 1, lots: 2 }

/** One spelling per constraint set: duplicates dropped, a fixed order. */
export function normaliseConstraints(constraints: readonly ProposalConstraint[]): ProposalConstraint[] {
  const unique = [...new Map(constraints.map((c) => [JSON.stringify(c), c])).values()]
  return unique.sort((a, b) => CONSTRAINT_ORDER[a.kind] - CONSTRAINT_ORDER[b.kind] || JSON.stringify(a).localeCompare(JSON.stringify(b)))
}

/** One spelling per edit set: by symbol, then by kind. */
export function normaliseEdits(edits: readonly LegEdit[]): LegEdit[] {
  return [...edits].sort((a, b) => a.symbol.localeCompare(b.symbol) || EDIT_ORDER[a.kind] - EDIT_ORDER[b.kind])
}

export function generationConstraintsOf(constraints: readonly ProposalConstraint[]): GenerationConstraints {
  const caps = constraints.flatMap((c) => (c.kind === 'cap_realised_gains' ? [c.usd] : []))
  return {
    harvestOnly: constraints.some((c) => c.kind === 'harvest_only'),
    capRealisedGains: caps.length > 0 ? Math.min(...caps) : undefined,
    excludeAssetClasses: constraints.flatMap((c) => (c.kind === 'exclude_asset_class' ? [c.assetClass] : [])),
    avoidSelfWash: constraints.some((c) => c.kind === 'avoid_self_wash'),
  }
}

const NOTHING_SOLD: LegSale = { soldLosses: [], consumedLotIds: [] }

/** Workbench edits on top of the agent's legs. Each edited leg is re-cut by the engine; anything untradeable is refused. */
export function applyEdits(accountId: string, base: RebalanceProposal, edits: readonly LegEdit[]): { ok: true; proposal: RebalanceProposal; excludedLegs: ExcludedLeg[] } | EngineFailure {
  const symbols = new Set(base.legs.map((l) => l.symbol))
  const seen = new Set<string>()
  for (const e of edits) {
    if (!symbols.has(e.symbol)) return fail('NOT_A_LEG', `${e.symbol} is not a leg of this proposal.`)
    const key = `${e.kind}:${e.symbol}`
    if (seen.has(key)) return fail('DUPLICATE_EDIT', `${e.symbol} has two ${e.kind} edits.`)
    seen.add(key)
  }
  const excluded = new Set(edits.flatMap((e) => (e.kind === 'exclude' ? [e.symbol] : [])))
  const quantities = new Map(edits.flatMap((e) => (e.kind === 'quantity' ? [[e.symbol, e.quantity] as const] : [])))
  const lots = new Map(edits.flatMap((e) => (e.kind === 'lots' ? [[e.symbol, e.lotIds] as const] : [])))
  const legs: ProposedTradeLeg[] = []
  const sales = new Map<ProposedTradeLeg, LegSale>()
  const heldBack = new Map(base.heldBack)
  const excludedLegs: ExcludedLeg[] = []
  for (const leg of base.legs) {
    if (excluded.has(leg.symbol)) {
      excludedLegs.push({ symbol: leg.symbol, name: leg.name, side: leg.side, quantity: leg.quantity, estimatedValue: leg.estimatedValue })
      if (!heldBack.has(leg.assetClass)) heldBack.set(leg.assetClass, 'excluded_by_constraint')
      continue
    }
    const quantity = quantities.get(leg.symbol)
    const lotIds = lots.get(leg.symbol)
    if (quantity === undefined && lotIds === undefined) {
      legs.push(leg)
      sales.set(leg, base.sales.get(leg) ?? NOTHING_SOLD)
      continue
    }
    const cut = recutLeg(accountId, leg, { quantity: quantity ?? leg.quantity, lotIds })
    if (!cut.ok) return fail(cut.code, cut.message)
    legs.push(cut.leg)
    sales.set(cut.leg, cut.sale)
  }
  return { ok: true, proposal: { legs, sales, heldBack }, excludedLegs }
}

export function taxSummaryOf(preview: RebalancePreview): ProposalTaxSummary {
  const sum = (f: (t: ProposedTrade) => number) => preview.trades.reduce((s, t) => s + f(t), 0)
  return {
    sold: sum((t) => (t.side === 'sell' ? t.estimatedValue : 0)),
    bought: sum((t) => (t.side === 'buy' ? t.estimatedValue : 0)),
    gains: realisedGains(preview.trades),
    losses: sum((t) => Math.min(0, t.realisedShortTerm) + Math.min(0, t.realisedLongTerm)),
    netShortTerm: sum((t) => t.realisedShortTerm),
    netLongTerm: sum((t) => t.realisedLongTerm),
    washed: sum((t) => (t.washedLoss?.shortTerm ?? 0) + (t.washedLoss?.longTerm ?? 0)),
    grossTax: preview.grossTaxOnGains,
    netTax: preview.estimatedTaxImpact,
  }
}

/**
 * One version: the agent's legs under `constraints`, `edits` on top, then the engine's preview
 * (§1091 settled, the return-level estimate against year-to-date results, drift after the trades)
 * and the proposal-level pre-trade check. The fingerprint covers the account, the constraints, the
 * edits, every leg and every lot it sells.
 */
export function buildVersion(accountId: string, constraints: readonly ProposalConstraint[], edits: readonly LegEdit[]): { ok: true; built: DraftPreview; names: ReadonlyMap<string, string> } | EngineFailure {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return fail('NO_ACCOUNT', 'Account not found.')
  const generated = generateRebalanceProposal(accountId, true, PROPOSAL_DRIFT_THRESHOLD, undefined, generationConstraintsOf(constraints))
  const symbols = generated.legs.map((l) => l.symbol)
  if (new Set(symbols).size !== symbols.length) throw new Error(`The proposal for ${accountId} names a symbol twice; edits address legs by symbol`)
  const edited = applyEdits(accountId, generated, edits)
  if (!edited.ok) return edited
  const [preview] = buildRebalancePreviews([{ account, ...edited.proposal }], true, PROPOSAL_DRIFT_THRESHOLD, MOCK_TODAY_ISO)
  if (!preview) throw new Error(`No preview for ${accountId}`)
  const pretrade = evaluateProposal(accountId, preview.trades.map(({ symbol, side, quantity, estimatedValue }) => ({ symbol, side, quantity, estimatedValue })))
  if (!pretrade) throw new Error(`No pre-trade result for ${accountId}`)
  const legFacts: LegFacts[] = edited.proposal.legs.flatMap((leg, i) => {
    const settled = preview.trades[i]
    if (leg.side !== 'sell' || !settled) return []
    return [{
      symbol: leg.symbol,
      lotIds: [...(edited.proposal.sales.get(leg)?.consumedLotIds ?? [])],
      washed: (settled.washedLoss?.shortTerm ?? 0) + (settled.washedLoss?.longTerm ?? 0),
    }]
  })
  const content = {
    accountId,
    constraints: normaliseConstraints(constraints),
    edits: normaliseEdits(edits),
    legs: preview.trades.map((t) => [t.symbol, t.side, t.quantity, t.estimatedValue]),
    lots: legFacts.map((f) => [f.symbol, f.lotIds]),
  }
  return {
    ok: true,
    built: { preview, pretrade, legFacts, excludedLegs: edited.excludedLegs, summary: taxSummaryOf(preview), fingerprint: fingerprint(JSON.stringify(content)) },
    names: new Map(generated.legs.map((l) => [l.symbol, l.name])),
  }
}

export function editSummary(edits: readonly LegEdit[], names: ReadonlyMap<string, string>): string {
  if (edits.length === 0) return "Back to the agent's legs, with no workbench edits."
  const who = (symbol: string) => claimNameOf(symbol, names.get(symbol))
  const parts = normaliseEdits(edits).map((e) => {
    switch (e.kind) {
      case 'exclude': return `excluded ${who(e.symbol)}`
      case 'quantity': return `set the ${who(e.symbol)} quantity`
      case 'lots': return `chose specific lots for ${who(e.symbol)}`
    }
  })
  return `Workbench edits: ${parts.join('; ')}.`
}
```

The editSummary test lists INTC's lots first because `normaliseEdits` orders by symbol (INTC, QAI, SPY); `SPDR S&P 500 ETF` contains digits, so `claimNameOf` names it `SPY`.

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/workspace/__tests__/proposal-engine.test.ts`
Expected: PASS. If the v1 legs or summary differ from the pinned figures, stop and report: they are the Phase 0 acc-002 figures (`messages.ts` msg-003 states the same net $10,422 and gross $29,128) and a difference means Task 2 or 3 changed the unconstrained engine.

- [ ] **Step 5: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/workspace/proposal-engine.ts src/mocks/workspace/__tests__/proposal-engine.test.ts
git commit -m "feat(engine): proposal versions — constraints and edits to a checked, fingerprinted preview"
```

### Task 5: Approve and withdraw as binding acts

**Files:**
- Create: `src/mocks/workspace/proposal-acts.ts`
- Modify: `src/mocks/workspace/acts.ts` (a stale letter cannot be sent)
- Test: `src/mocks/workspace/__tests__/proposal-acts.test.ts`, `src/mocks/workspace/__tests__/proposal-fixture.ts` (test helper, not a test file)

**Interfaces:**
- Consumes: Task 1 store and `proposals-store` functions; Task 4 `buildVersion`.
- Produces:

```ts
// src/mocks/workspace/proposal-acts.ts
export type ActFailure = { ok: false; status: 403 | 404 | 409; code: string; message: string }
/** The proposal if `viewerId` may see it: a firm viewer who can see its thread. */
export function visibleProposal(viewerId: string, proposalId: string): Proposal | undefined
export function approveProposal(viewerId: string, proposalId: string, version: number, fingerprint: string): { ok: true; act: BindingAct } | ActFailure
export function withdrawApproval(viewerId: string, proposalId: string): { ok: true; act: BindingAct } | ActFailure
```

Rules: only `can(viewer, 'approve_proposal')`; the version must exist and match the fingerprint; no `block` in its pre-trade result; it must have legs. Approval records an act in the proposal's team thread, stages one order per leg with status `pending_compliance`, and — when an older version was approved — supersedes that approval and withdraws its staged orders in the same act. `withdraw_approval` only by the approver. No order is ever released. A letter whose basis is no longer the active approval is refused by `send_to_client` with `409 STALE_DRAFT`.

- [ ] **Step 1: Write the test fixture helper**

```ts
// src/mocks/workspace/__tests__/proposal-fixture.ts
import type { LegEdit, Proposal, ProposalConstraint, ProposalVersion } from '@/types/workspace-proposal'
import { nextAt, store } from '@/mocks/data/workspace-store'
import { nextProposalId } from '@/mocks/data/proposals-store'
import { buildVersion } from '../proposal-engine'

export const AGENT_CONSTRAINTS: ProposalConstraint[] = [{ kind: 'avoid_self_wash' }]

export function versionOf(n: number, constraints: ProposalConstraint[], edits: LegEdit[] = []): ProposalVersion {
  const r = buildVersion('acc-002', constraints, edits)
  if (!r.ok) throw new Error(r.message)
  return { n, author: { kind: 'agent', agentId: 'proposal' }, createdAt: nextAt(), constraints, edits, changeSummary: 'Drafted a tax-aware rebalance.', ...r.built }
}

/** A Johnson proposal with v1 by the agent, placed straight in the store (Task 7 adds the real operation). */
export function seedJohnsonProposal(): Proposal {
  const proposal: Proposal = {
    id: nextProposalId(), title: 'Johnson rebalance', accountId: 'acc-002', clientId: 'cli-001', threadId: 'th-johnson-review',
    versions: [versionOf(1, AGENT_CONSTRAINTS)],
  }
  store().proposals.push(proposal)
  return proposal
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/mocks/workspace/__tests__/proposal-acts.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { approvalState } from '@/mocks/data/proposals-store'
import { approveProposal, withdrawApproval } from '../proposal-acts'
import { sendToClient } from '../acts'
import { AGENT_CONSTRAINTS, seedJohnsonProposal, versionOf } from './proposal-fixture'

describe('approve_proposal', () => {
  beforeEach(() => resetWorkspaceStore())

  it('records one act in the team thread and stages every leg pending compliance', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    const r = approveProposal('user-001', p.id, 1, v1.fingerprint)
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toMatchObject({ id: 'REC-0001', kind: 'approve_proposal', actorId: 'user-001', threadId: 'th-johnson-review', subject: { type: 'proposal', id: p.id }, version: 1, fingerprint: v1.fingerprint, summary: 'Approved v1 of the Johnson rebalance' })
    const staged = store().staged
    expect(staged.map((o) => [o.symbol, o.side, o.quantity])).toEqual(v1.preview.trades.map((t) => [t.symbol, t.side, t.quantity]))
    expect(staged.every((o) => o.status === 'pending_compliance' && o.approvalActId === 'REC-0001')).toBe(true)
    const marker = store().messages[store().messages.length - 1]!
    expect(marker).toMatchObject({ kind: 'act', threadId: 'th-johnson-review', actId: 'REC-0001' })
    expect(approvalState(p)).toMatchObject({ kind: 'approved', version: 1, latestVersion: 1 })
  })

  it('refuses a second approval of the same version, a stale fingerprint, a missing version', () => {
    const p = seedJohnsonProposal()
    const fp = p.versions[0]!.fingerprint
    expect(approveProposal('user-001', p.id, 1, 'DEADBEEF')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    expect(approveProposal('user-001', p.id, 2, fp)).toMatchObject({ ok: false, status: 404, code: 'NO_VERSION' })
    expect(approveProposal('user-001', p.id, 1, fp).ok).toBe(true)
    expect(approveProposal('user-001', p.id, 1, fp)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_APPROVED' })
    expect(store().acts).toHaveLength(1)
  })

  it('only the advisor approves; a client cannot even see the proposal', () => {
    const p = seedJohnsonProposal()
    const fp = p.versions[0]!.fingerprint
    expect(approveProposal('user-002', p.id, 1, fp)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('user-003', p.id, 1, fp)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('cco-001', p.id, 1, fp)).toMatchObject({ ok: false, status: 403 })
    expect(approveProposal('cli-001', p.id, 1, fp)).toMatchObject({ ok: false, status: 404 })
    expect(approveProposal('user-001', 'prop-9999', 1, fp)).toMatchObject({ ok: false, status: 404 })
    expect(store().acts).toEqual([])
  })

  it('refuses a version the pre-trade check blocks', () => {
    const p = seedJohnsonProposal()
    const blocked = versionOf(2, AGENT_CONSTRAINTS, [{ kind: 'quantity', symbol: 'VWO', quantity: 100_000 }])
    expect(blocked.pretrade.violations.some((v) => v.severity === 'block')).toBe(true)
    p.versions.push(blocked)
    expect(approveProposal('user-001', p.id, 2, blocked.fingerprint)).toMatchObject({ ok: false, status: 409, code: 'BLOCKED' })
  })

  it('a newer version leaves the approval on the older one; approving it withdraws the older approval in the same act', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint)
    const v2 = versionOf(2, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }])
    p.versions.push(v2)
    expect(approvalState(p)).toMatchObject({ kind: 'approved', version: 1, latestVersion: 2 })
    const r = approveProposal('user-001', p.id, 2, v2.fingerprint)
    if (!r.ok) throw new Error(r.message)
    expect(r.act.summary).toBe('Approved v2 of the Johnson rebalance; the approval of v1 is withdrawn')
    expect(store().acts).toHaveLength(2)
    expect(store().approvals.map((a) => [a.version, a.status])).toEqual([[1, 'superseded'], [2, 'active']])
    expect(store().staged.filter((o) => o.version === 1).every((o) => o.status === 'withdrawn')).toBe(true)
    expect(store().staged.filter((o) => o.version === 2).every((o) => o.status === 'pending_compliance')).toBe(true)
  })
})

describe('withdraw_approval', () => {
  beforeEach(() => resetWorkspaceStore())

  it('only the approver withdraws; the staging is withdrawn; nothing is ever released', () => {
    const p = seedJohnsonProposal()
    expect(withdrawApproval('user-001', p.id)).toMatchObject({ ok: false, status: 409, code: 'NOT_APPROVED' })
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint)
    expect(withdrawApproval('user-002', p.id)).toMatchObject({ ok: false, status: 403 })
    const r = withdrawApproval('user-001', p.id)
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toMatchObject({ kind: 'withdraw_approval', version: 1, summary: 'Withdrew the approval of v1 of the Johnson rebalance' })
    expect(approvalState(p).kind).toBe('unapproved')
    expect(store().staged.every((o) => o.status === 'withdrawn')).toBe(true)
    expect(new Set(store().staged.map((o) => o.status))).not.toContain('released')
  })
})

describe('send_to_client refuses a stale letter', () => {
  beforeEach(() => resetWorkspaceStore())

  it('a letter drafted from v1 cannot be sent once v2 is the approval', () => {
    const p = seedJohnsonProposal()
    const v1 = p.versions[0]!
    approveProposal('user-001', p.id, 1, v1.fingerprint)
    store().drafts.push({ id: 'draft-0001', clientThreadId: 'th-robert', authorId: 'user-001', body: 'Letter', createdAt: 'x', agentId: 'client-letter', basis: { proposalId: p.id, version: 1, fingerprint: v1.fingerprint } })
    const v2 = versionOf(2, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }])
    p.versions.push(v2)
    approveProposal('user-001', p.id, 2, v2.fingerprint)
    expect(sendToClient('user-001', 'draft-0001')).toMatchObject({ ok: false, status: 409, code: 'STALE_DRAFT' })
    expect(store().messages.some((m) => m.kind === 'text' && m.body === 'Letter')).toBe(false)
  })
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/workspace/__tests__/proposal-acts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// src/mocks/workspace/proposal-acts.ts
import type { BindingAct, Message } from '@/types/workspace'
import type { ApprovalRecord, Proposal, StagedOrder } from '@/types/workspace-proposal'
import { can, personById } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { activeApproval, nextStagedId, proposalById } from '@/mocks/data/proposals-store'
import { canSeeThread } from './visibility'

export type ActFailure = { ok: false; status: 403 | 404 | 409; code: string; message: string }
type Recorded = { ok: true; act: BindingAct }

const NOT_FOUND: ActFailure = { ok: false, status: 404, code: 'NO_PROPOSAL', message: 'Proposal not found.' }

export function visibleProposal(viewerId: string, proposalId: string): Proposal | undefined {
  const proposal = proposalById(proposalId)
  if (!proposal || personById(viewerId)?.role === 'client') return undefined
  const thread = store().threads.find((t) => t.id === proposal.threadId)
  return thread && canSeeThread(viewerId, thread) ? proposal : undefined
}

function record(act: BindingAct): void {
  const s = store()
  s.acts.push(act)
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: act.threadId, at: nextAt(), actId: act.id }
  s.messages.push(marker)
}

function withdrawStaging(actId: string): void {
  const s = store()
  s.staged = s.staged.map((o) => (o.approvalActId === actId && o.status === 'pending_compliance' ? { ...o, status: 'withdrawn' } : o))
}

function setStatus(approval: ApprovalRecord, status: ApprovalRecord['status']): void {
  const s = store()
  s.approvals = s.approvals.map((a) => (a === approval ? { ...a, status } : a))
}

export function approveProposal(viewerId: string, proposalId: string, version: number, fingerprint: string): Recorded | ActFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  if (!can(viewerId, 'approve_proposal')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can approve a proposal.' }
  const v = proposal.versions.find((x) => x.n === version)
  if (!v) return { ok: false, status: 404, code: 'NO_VERSION', message: `There is no v${version} of this proposal.` }
  if (v.fingerprint !== fingerprint) return { ok: false, status: 409, code: 'FINGERPRINT_MISMATCH', message: `v${version} is not the content you reviewed. Open it again before approving.` }
  if (v.pretrade.violations.some((x) => x.severity === 'block')) return { ok: false, status: 409, code: 'BLOCKED', message: `The pre-trade check blocks v${version}; it cannot be approved.` }
  if (v.preview.trades.length === 0) return { ok: false, status: 409, code: 'NO_LEGS', message: `v${version} has no legs to approve.` }
  const previous = activeApproval(proposal.id)
  if (previous?.version === version) return { ok: false, status: 409, code: 'ALREADY_APPROVED', message: `v${version} is already approved (${previous.actId}).` }

  const at = nextAt()
  const actId = commitActId()
  if (previous) {
    setStatus(previous, 'superseded')
    withdrawStaging(previous.actId)
  }
  const act: BindingAct = {
    id: actId, kind: 'approve_proposal', actorId: viewerId, at, threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version, fingerprint: v.fingerprint,
    summary: previous
      ? `Approved v${version} of the ${proposal.title}; the approval of v${previous.version} is withdrawn`
      : `Approved v${version} of the ${proposal.title}`,
  }
  const s = store()
  s.approvals.push({ proposalId: proposal.id, version, fingerprint: v.fingerprint, actId, approverId: viewerId, at, status: 'active' })
  // Staged, never released: Phase 4 adds the compliance disposition and release.
  const staged: StagedOrder[] = v.preview.trades.map((t) => ({
    id: nextStagedId(), proposalId: proposal.id, version, accountId: proposal.accountId, symbol: t.symbol, side: t.side,
    quantity: t.quantity, estimatedValue: t.estimatedValue, currency: t.currency, status: 'pending_compliance', stagedAt: at, approvalActId: actId,
  }))
  s.staged.push(...staged)
  record(act)
  return { ok: true, act }
}

export function withdrawApproval(viewerId: string, proposalId: string): Recorded | ActFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const active = activeApproval(proposal.id)
  if (!active) return { ok: false, status: 409, code: 'NOT_APPROVED', message: 'No version of this proposal is approved.' }
  if (!can(viewerId, 'withdraw_approval') || active.approverId !== viewerId) {
    return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the approver can withdraw this approval.' }
  }
  const act: BindingAct = {
    id: commitActId(), kind: 'withdraw_approval', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: active.version, fingerprint: active.fingerprint,
    summary: `Withdrew the approval of v${active.version} of the ${proposal.title}`,
  }
  setStatus(active, 'withdrawn')
  withdrawStaging(active.actId)
  record(act)
  return { ok: true, act }
}
```

In `src/mocks/workspace/acts.ts`, import `isDraftStale` from `@/mocks/data/proposals-store` and, directly after the `can(viewerId, 'send_to_client')` check, add:

```ts
  if (isDraftStale(draft)) {
    return { ok: false, status: 409, code: 'STALE_DRAFT', message: `This letter was drafted from v${draft.basis?.version ?? 0}, which is no longer the approved version. Ask for a new letter.` }
  }
```

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/workspace/__tests__/ src/mocks/handlers/__tests__/workspace-write.test.ts src/mocks/handlers/__tests__/workspace-invariants.test.ts`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/workspace/proposal-acts.ts src/mocks/workspace/acts.ts src/mocks/workspace/__tests__/proposal-acts.test.ts src/mocks/workspace/__tests__/proposal-fixture.ts
git commit -m "feat(engine): approve and withdraw one exact version; orders staged pending compliance; stale letters refused"
```

### Task 6: Harvest Scanner, the Brief ready on load, and carrying a finding

**Files:**
- Create: `src/mocks/agents/harvest-scanner.ts`, `src/mocks/workspace/run-key.ts`, `src/mocks/workspace/brief.ts`, `src/mocks/workspace/carry.ts`
- Modify: `src/mocks/agents/registry.ts` (add the runner), `src/mocks/workspace/run-agent.ts` (use `runKeyOf`), `src/mocks/data/workspace-seed.ts` (Brief agents), `src/mocks/data/workspace-store.ts` (seed the Brief), `src/workspace/__tests__/context.test.tsx` (the Brief's "Who can see" list gains the Harvest Scanner)
- Test: `src/mocks/agents/__tests__/harvest-scanner.test.ts`, `src/mocks/workspace/__tests__/brief.test.ts`, `src/mocks/workspace/__tests__/carry.test.ts`

**Interfaces:**
- Consumes: Task 1 types and store; `AgentContext`, `AgentFinding` (`src/mocks/agents/agent.ts`); `generateTaxLotsWithSaleRisk`; `lossAllowedNow`, `lossDeferred`, `lossDisallowed`, `isHarvestable` (`@/lib/tax-rules`); `openWashSaleWindowsFor`, `sameWashSaleTaxpayer`, `washSaleTaxpayer`; `heldAwayAssets`.
- Produces:

```ts
// src/mocks/agents/harvest-scanner.ts
export type PositionLosses = { allowed: number; deferred: number; disallowed: number }
export function harvestClaim(name: string, symbol: string, losses: PositionLosses): string
export function runHarvestScanner(context: AgentContext): AgentFinding[]
/** Held-away assets of the account's wash-sale taxpayer; none for a trust, entity or custodial account, which is its own taxpayer. */
export function taxpayerHeldAway(account: Account): HeldAwayAsset[]
// src/mocks/workspace/run-key.ts
export function runKeyOf(agentId: AgentId, threadId: string, subject: Subject): string
// src/mocks/workspace/brief.ts
export const BRIEF_THREAD_ID = 'th-brief'
export function briefMessages(): Message[]          // ranked summary first, then the findings; all at MOCK_NOW_ISO
// src/mocks/workspace/carry.ts
export function carryFinding(viewerId: string, fromThreadId: string, findingId: string, toThreadId: string):
  { ok: true; message: Extract<Message, { kind: 'carried' }>; created: boolean } | { ok: false; status: 400 | 403 | 404; code: string; message: string }
```

The Brief is the owner's private thread on acc-002. It is ready on load: its findings are computed at the frozen morning (`MOCK_NOW_ISO`, the calculations' as-of, before any seeded conversation), with the same run keys a run would use, so "Ask Drift Monitor" on the Brief returns them rather than duplicating them.

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/agents/__tests__/harvest-scanner.test.ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'
import { lossAllowedNow } from '@/lib/tax-rules'
import { convertToBase } from '@/lib/currency'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { harvestClaim, runHarvestScanner, taxpayerHeldAway } from '../harvest-scanner'

const ctx = (id: string) => ({ asOf: MOCK_NOW_ISO, subject: { type: 'account' as const, id } })
const figure = (findings: ReturnType<typeof runHarvestScanner>, label: string) => findings.flatMap((f) => f.figures).find((x) => x.label === label)

describe('Harvest Scanner over the whole book', () => {
  it.each(accounts.map((a) => a.id))('%s: digit-free claims, finite sourced figures, cited', (id) => {
    for (const f of runHarvestScanner(ctx(id))) {
      expect(f.claim).not.toMatch(/\d/)
      expect(f.claim.toLowerCase()).not.toContain('cleared')
      expect(f.claim.toLowerCase()).not.toContain('household')
      expect(f.citations.length).toBeGreaterThan(0)
      for (const fig of f.figures) {
        expect(Number.isFinite(fig.value)).toBe(true)
        expect(fig.source.length).toBeGreaterThan(0)
      }
    }
  })

  it('runs are deterministic', () => {
    expect(runHarvestScanner(ctx('acc-002'))).toEqual(runHarvestScanner(ctx('acc-002')))
  })

  it.each(accounts.map((a) => a.id))('%s: every loss it cites is the engine\'s allowed loss for that position, in USD', (id) => {
    const account = accounts.find((a) => a.id === id)!
    const lots = generateTaxLotsWithSaleRisk(account.id, account.totalValue)
    const positions = getPositionsForAccount(account.id, account.totalValue)
    for (const fig of runHarvestScanner(ctx(id)).flatMap((f) => f.figures).filter((x) => x.label.startsWith('Loss allowed now · '))) {
      const position = positions.find((p) => p.symbol === fig.label.slice('Loss allowed now · '.length))!
      const allowed = lots.filter((l) => l.positionId === position.id).reduce((s, l) => s + lossAllowedNow(l), 0)
      expect(fig.value).toBe(Math.round(convertToBase(allowed, account.baseCurrency ?? 'USD', FX_RATES_USD_BASE)))
      expect(fig.value).toBeLessThan(0)
    }
  })
})

describe('Harvest Scanner on acc-002', () => {
  const findings = runHarvestScanner(ctx('acc-002'))

  it('leads with the 7,000 INTC: the loss allowed now, nothing washed, and the window a sale today opens', () => {
    expect(findings[0]!.claim).toBe('Intel Corp. can be sold at a loss today, and none of the loss would be washed.')
    expect(findings[0]!.attention).toBe('attention')
    expect(figure(findings, 'Loss allowed now · INTC')?.value).toBe(-45_850)
    expect(figure(findings, 'Washed · INTC')?.value).toBe(0)
    expect(figure(findings, 'Shares · INTC')?.value).toBe(7_000)
    expect(findings[0]!.citations.map((c) => c.source)).toContain('Wash-sale window · a sale of INTC on 2026-02-25 restricts buying it back until 2026-03-27')
  })

  it("states the taxpayer's open INTC restriction from rs-001", () => {
    const restriction = findings.find((f) => f.citations.some((c) => c.source.startsWith('Wash-sale window · rs-001')))!
    expect(restriction.claim).toBe('Intel Corp. was sold at a loss recently; buying it back in any account of the same taxpayer, IRAs and Roths included, would wash that loss until its window closes.')
    expect(figure([restriction], 'Days until the INTC window closes')?.value).toBe(25)
    expect(figure([restriction], 'Loss realised · INTC')?.value).toBe(-32_750)
    expect(restriction.citations[0]!.source).toBe('Wash-sale window · rs-001 · INTC loss sale of 2026-02-20, open to 2026-03-22')
  })

  it('flags the held-away accounts as not visible to wash-sale checks', () => {
    const away = findings.find((f) => f.claim.startsWith('Held-away accounts'))!
    expect(away.claim).toBe('Held-away accounts are not visible to wash-sale checks; a purchase in one can still wash a loss.')
    expect(away.figures.map((f) => [f.label, f.value])).toEqual([['Held away · Vanguard 401(k)', 2_400_000], ['Held away · TIAA 403(b)', 1_500_000]])
  })
})

describe('Harvest Scanner wording', () => {
  it('a tax-advantaged account has no loss to harvest, but its purchases are still restricted', () => {
    const ira = runHarvestScanner(ctx('acc-003'))
    expect(ira[0]!.claim).toBe('Sales in this account are not taxed, so there is no loss to harvest here.')
    expect(ira.some((f) => f.claim.startsWith('Intel Corp. was sold at a loss recently'))).toBe(true)
  })
  it('an irrevocable trust is its own taxpayer: no one else\'s held-away accounts', () => {
    expect(taxpayerHeldAway(accounts.find((a) => a.id === 'acc-006')!)).toEqual([])
  })
  it('a coin held directly is outside the wash-sale rule', () => {
    expect(harvestClaim('Ether', 'ETH', { allowed: -100, deferred: 0, disallowed: 0 })).toBe('Ether can be sold at a loss today; as a coin held directly it is outside the wash-sale rule.')
  })
  it('an IRA or Roth replacement makes part of the loss permanently disallowed; a taxable one defers it', () => {
    expect(harvestClaim('Intel Corp.', 'INTC', { allowed: -100, deferred: -10, disallowed: -20 })).toBe(
      'Intel Corp. can be sold at a loss today; part of the loss would be deferred into the replacement shares, and part would be permanently disallowed because the replacement was bought in an IRA or Roth.')
  })
})
```

```ts
// src/mocks/workspace/__tests__/brief.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type { Message } from '@/types/workspace'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { BRIEF_THREAD_ID, briefMessages } from '../brief'
import { runAgent } from '../run-agent'
import { runKeyOf } from '../run-key'

type Finding = Extract<Message, { kind: 'agent_finding' }>
const findings = () => briefMessages().filter((m): m is Finding => m.kind === 'agent_finding')

describe('the Brief, ready on load', () => {
  beforeEach(() => resetWorkspaceStore())

  it('opens with a ranked summary: findings that need attention first, Drift Monitor before Harvest Scanner', () => {
    const [summary] = briefMessages()
    if (summary?.kind !== 'brief_summary') throw new Error('The Brief must open with its summary')
    const byId = new Map(findings().map((f) => [f.id, f]))
    const ranked = summary.items.map((i) => byId.get(i.findingId)!)
    expect(ranked.length).toBe(findings().length)
    const attention = ranked.map((f) => f.attention)
    expect(attention).toEqual([...attention].sort((a, b) => Number(b === 'attention') - Number(a === 'attention')))
    expect(ranked[0]).toMatchObject({ agentId: 'drift-monitor', claim: 'US Equity is outside its tolerance band.' })
    expect(ranked[1]).toMatchObject({ agentId: 'harvest-scanner', claim: 'Intel Corp. can be sold at a loss today, and none of the loss would be washed.' })
    for (const item of summary.items) expect(item.claim).not.toMatch(/\d/)
  })

  it('is computed at the frozen morning with the run keys a run would use', () => {
    for (const m of briefMessages()) {
      expect(m.threadId).toBe(BRIEF_THREAD_ID)
      expect(m.at).toBe(MOCK_NOW_ISO)
    }
    for (const f of findings()) expect(f.runKey).toBe(runKeyOf(f.agentId, BRIEF_THREAD_ID, { type: 'account', id: 'acc-002' }))
  })

  it('is in the store on load, and asking its agents again adds nothing', () => {
    const before = store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID).map((m) => m.id)
    expect(before).toEqual(briefMessages().map((m) => m.id))
    for (const agent of ['drift-monitor', 'harvest-scanner'] as const) {
      const r = runAgent('user-001', BRIEF_THREAD_ID, agent)
      if (!r.ok) throw new Error(r.message)
      expect(r.findings.every((f) => before.includes(f.id))).toBe(true)
    }
    expect(store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID)).toHaveLength(before.length)
  })
})
```

```ts
// src/mocks/workspace/__tests__/carry.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { carryFinding } from '../carry'

const intcFinding = () => store().messages.find((m) => m.kind === 'agent_finding' && m.agentId === 'harvest-scanner')!

describe('carrying a Brief finding into a team thread', () => {
  beforeEach(() => resetWorkspaceStore())

  it('posts a quoted card with who carried it and when; a repeat returns the same card', () => {
    const finding = intcFinding()
    const first = carryFinding('user-001', 'th-brief', finding.id, 'th-johnson-review')
    if (!first.ok) throw new Error(first.message)
    expect(first.created).toBe(true)
    expect(first.message).toMatchObject({ kind: 'carried', threadId: 'th-johnson-review', carriedBy: 'user-001', fromThreadId: 'th-brief', findingId: finding.id })
    if (finding.kind !== 'agent_finding') throw new Error('expected a finding')
    expect(first.message.finding).toEqual({ agentId: finding.agentId, at: finding.at, claim: finding.claim, figures: finding.figures, citations: finding.citations, attention: finding.attention })
    const again = carryFinding('user-001', 'th-brief', finding.id, 'th-johnson-review')
    expect(again).toMatchObject({ ok: true, created: false, message: { id: first.message.id } })
    expect(store().messages.filter((m) => m.kind === 'carried')).toHaveLength(1)
  })

  it('refuses a client thread, someone else\'s brief, a summary, and anything the viewer cannot see', () => {
    const id = intcFinding().id
    expect(carryFinding('user-001', 'th-brief', id, 'th-robert')).toMatchObject({ ok: false, status: 400 })
    expect(carryFinding('user-002', 'th-brief', id, 'th-johnson-review')).toMatchObject({ ok: false, status: 404 })
    expect(carryFinding('cco-001', 'th-brief', id, 'th-johnson-review')).toMatchObject({ ok: false, status: 404 })
    expect(carryFinding('cli-001', 'th-brief', id, 'th-johnson-review')).toMatchObject({ ok: false, status: 404 })
    expect(carryFinding('user-001', 'th-brief', 'msg-b00', 'th-johnson-review')).toMatchObject({ ok: false, status: 404, code: 'NO_FINDING' })
    expect(carryFinding('user-001', 'th-brief', id, 'th-nowhere')).toMatchObject({ ok: false, status: 404 })
    expect(store().messages.some((m) => m.kind === 'carried')).toBe(false)
  })
})
```

In `src/workspace/__tests__/context.test.tsx`, "a private thread is seen by its owner alone" now expects `['Adrian Hale · Advisor', expect.stringMatching(/^Drift Monitor/), expect.stringMatching(/^Harvest Scanner/)]`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/agents/__tests__/harvest-scanner.test.ts src/mocks/workspace/__tests__/brief.test.ts src/mocks/workspace/__tests__/carry.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the Harvest Scanner**

```ts
// src/mocks/agents/harvest-scanner.ts
import type { AgentContext, AgentFinding } from './agent'
import type { Account } from '@/types/account'
import type { HeldAwayAsset } from '@/types/held-away'
import type { Figure } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { washSaleWindow } from '@/mocks/data/realised-sales'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { generateTaxLotsWithSaleRisk } from '@/mocks/handlers/custodian'
import { openWashSaleWindowsFor, sameWashSaleTaxpayer, washSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { isHarvestable, lossAllowedNow, lossDeferred, lossDisallowed } from '@/lib/tax-rules'
import { isSubjectToWashSale } from '@/lib/security-master'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { convertToBase } from '@/lib/currency'
import { claimNameOf } from './claim-name'

export type PositionLosses = { allowed: number; deferred: number; disallowed: number }

/** What a sale today does to one position's loss (§1091), in words with no digits. */
export function harvestClaim(name: string, symbol: string, { deferred, disallowed }: PositionLosses): string {
  if (!isSubjectToWashSale(symbol)) return `${name} can be sold at a loss today; as a coin held directly it is outside the wash-sale rule.`
  if (deferred === 0 && disallowed === 0) return `${name} can be sold at a loss today, and none of the loss would be washed.`
  const parts = [
    ...(deferred < 0 ? ['part of the loss would be deferred into the replacement shares'] : []),
    ...(disallowed < 0 ? [`${deferred < 0 ? 'part' : 'part of the loss'} would be permanently disallowed because the replacement was bought in an IRA or Roth`] : []),
  ]
  return `${name} can be sold at a loss today; ${parts.join(', and ')}.`
}

export function taxpayerHeldAway(account: Account): HeldAwayAsset[] {
  if (washSaleTaxpayer(account).startsWith('account:')) return []
  const people = new Set(sameWashSaleTaxpayer(account).map((a) => a.clientId))
  return heldAwayAssets.filter((h) => people.has(h.clientId))
}

/** "401(k) — Former employer" → "401(k)". */
const shortAccountType = (accountType: string) => accountType.split(' — ')[0] ?? accountType

export function runHarvestScanner({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'account') return []
  const account = accounts.find((a) => a.id === subject.id)
  if (!account) return []
  const today = asOf.slice(0, 10)
  const lotsCite = [{ source: `Tax lots with wash-sale matching · ${account.name}`, asOf }]
  const findings: AgentFinding[] = []

  if (!isTaxableAccount(account.taxTreatment)) {
    findings.push({ claim: 'Sales in this account are not taxed, so there is no loss to harvest here.', attention: 'info', figures: [], citations: lotsCite })
  } else {
    const currency = account.baseCurrency ?? 'USD'
    const usd = (amount: number) => Math.round(convertToBase(amount, currency, FX_RATES_USD_BASE))
    const lots = generateTaxLotsWithSaleRisk(account.id, account.totalValue)
    const window = washSaleWindow(today)
    const harvestable = getPositionsForAccount(account.id, account.totalValue)
      .filter((p) => p.symbol !== 'CASH')
      .map((p) => {
        const own = lots.filter((l) => l.positionId === p.id)
        const sum = (f: (l: (typeof own)[number]) => number) => own.reduce((s, l) => s + f(l), 0)
        return { position: p, losses: { allowed: sum(lossAllowedNow), deferred: sum(lossDeferred), disallowed: sum(lossDisallowed) } }
      })
      .filter(({ losses }) => isHarvestable(losses.allowed, currency, FX_RATES_USD_BASE))
      .sort((a, b) => a.losses.allowed - b.losses.allowed)
    if (harvestable.length === 0) {
      findings.push({ claim: 'No position in this account can be sold at a loss today.', attention: 'info', figures: [], citations: lotsCite })
    }
    for (const { position: p, losses } of harvestable) {
      const figures: Figure[] = [
        { label: `Loss allowed now · ${p.symbol}`, value: usd(losses.allowed), unit: 'USD', source: 'lossAllowedNow' },
        { label: `Washed · ${p.symbol}`, value: usd(losses.deferred + losses.disallowed), unit: 'USD', source: 'lossDeferred + lossDisallowed' },
        { label: `Shares · ${p.symbol}`, value: p.quantity, unit: 'sh', source: 'positions.quantity' },
      ]
      const citations = isSubjectToWashSale(p.symbol)
        ? [...lotsCite, { source: `Wash-sale window · a sale of ${p.symbol} on ${today} restricts buying it back until ${window.end}`, asOf }]
        : lotsCite
      findings.push({ claim: harvestClaim(claimNameOf(p.symbol, p.name), p.symbol, losses), attention: 'attention', figures, citations })
    }
  }

  for (const w of openWashSaleWindowsFor(account, today)) {
    findings.push({
      claim: `${claimNameOf(w.symbol, w.name)} was sold at a loss recently; buying it back in any account of the same taxpayer, IRAs and Roths included, would wash that loss until its window closes.`,
      attention: 'info',
      figures: [
        { label: `Loss realised · ${w.symbol}`, value: w.realisedGainLoss, unit: 'USD', source: 'realisedSales.realisedGainLoss' },
        { label: `Days until the ${w.symbol} window closes`, value: w.daysRemaining, unit: 'd', source: 'openWashSaleWindows.daysRemaining' },
      ],
      citations: [{ source: `Wash-sale window · ${w.id} · ${w.symbol} loss sale of ${w.saleDate}, open to ${w.end}`, asOf }],
    })
  }

  const away = taxpayerHeldAway(account)
  if (away.length > 0) {
    findings.push({
      claim: 'Held-away accounts are not visible to wash-sale checks; a purchase in one can still wash a loss.',
      attention: 'info',
      figures: away.map((h) => ({ label: `Held away · ${h.institutionName} ${shortAccountType(h.accountType)}`, value: h.estimatedValue, unit: 'USD' as const, source: 'heldAwayAssets.estimatedValue' })),
      citations: away.map((h) => ({ source: `Held-away assets · ${h.institutionName} · as reported by the client`, asOf: h.lastUpdated })),
    })
  }
  return findings
}
```

Add `['harvest-scanner', runHarvestScanner]` to `RUNNERS` in `registry.ts`.

- [ ] **Step 4: The run key, the Brief and its seeding**

```ts
// src/mocks/workspace/run-key.ts
import type { AgentId, Subject } from '@/types/workspace'
import { MOCK_NOW_ISO } from '@/lib/clock'

/** One agent run: the same agent, thread, subject and as-of always find the same thing. */
export const runKeyOf = (agentId: AgentId, threadId: string, subject: Subject): string =>
  `${agentId}|${threadId}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}`
```

In `run-agent.ts` replace the inline template with `const runKey = runKeyOf(agentId, thread.id, subject)`.

```ts
// src/mocks/workspace/brief.ts
import type { AgentId, Message } from '@/types/workspace'
import { AGENT_DEFINITIONS } from '@/mocks/agents/registry'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { runKeyOf } from './run-key'

export const BRIEF_THREAD_ID = 'th-brief'

type Finding = Extract<Message, { kind: 'agent_finding' }>

let composed: readonly Message[] | undefined

/**
 * The Brief as it stands at the frozen morning: each of its agents' findings, computed at the
 * calculations' as-of, and a ranked summary ahead of them — findings that need attention first,
 * then in the order the Brief lists its agents. Deterministic, so it is composed once.
 */
export function briefMessages(): Message[] {
  composed ??= composeBrief()
  return composed.map((m) => ({ ...m }))
}

function composeBrief(): Message[] {
  const thread = SEED_THREADS.find((t) => t.id === BRIEF_THREAD_ID)
  const subject = thread?.subject
  if (!thread || !subject) throw new Error('The Brief thread needs a subject')
  const findings: Finding[] = thread.agentIds
    .flatMap((agentId) => {
      const agent = AGENT_DEFINITIONS.get(agentId)
      if (!agent) throw new Error(`The Brief lists ${agentId}, which reports no findings`)
      const runKey = runKeyOf(agentId, thread.id, subject)
      return agent.run({ asOf: MOCK_NOW_ISO, subject }).map((f) => ({ ...f, agentId, runKey }))
    })
    .map((f, i) => ({ kind: 'agent_finding', id: `msg-b${String(i + 1).padStart(2, '0')}`, threadId: thread.id, at: MOCK_NOW_ISO, ...f }))
  const order = (id: AgentId) => thread.agentIds.indexOf(id)
  const ranked = [...findings].sort((a, b) =>
    Number(b.attention === 'attention') - Number(a.attention === 'attention') || order(a.agentId) - order(b.agentId))
  const summary: Message = {
    kind: 'brief_summary', id: 'msg-b00', threadId: thread.id, at: MOCK_NOW_ISO,
    items: ranked.map((f) => ({ findingId: f.id, agentId: f.agentId, claim: f.claim, attention: f.attention })),
  }
  return [summary, ...findings]
}
```

`workspace-seed.ts`: the Brief's `agentIds` become `['drift-monitor', 'harvest-scanner']`.

`workspace-store.ts`: import `briefMessages` from `@/mocks/workspace/brief` and seed `messages: [...briefMessages(), ...SEED_MESSAGES.map((m) => ({ ...m }))]`. (The store already seeds lazily, so the engine has loaded before the Brief is composed.)

- [ ] **Step 5: Carrying**

```ts
// src/mocks/workspace/carry.ts
import type { Message } from '@/types/workspace'
import { can } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { canSeeThread } from './visibility'

type Carried = Extract<Message, { kind: 'carried' }>
type Finding = Extract<Message, { kind: 'agent_finding' }>
type Failure = { ok: false; status: 400 | 403 | 404; code: string; message: string }

/** The owner of a brief takes one of its findings to a team thread, as a quoted card. Repeating it returns the same card. */
export function carryFinding(viewerId: string, fromThreadId: string, findingId: string, toThreadId: string): { ok: true; message: Carried; created: boolean } | Failure {
  const s = store()
  const from = s.threads.find((t) => t.id === fromThreadId)
  if (!from || !canSeeThread(viewerId, from)) return { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }
  const finding = s.messages.find((m): m is Finding => m.kind === 'agent_finding' && m.id === findingId && m.threadId === from.id)
  if (!finding) return { ok: false, status: 404, code: 'NO_FINDING', message: 'Finding not found.' }
  if (from.visibility !== 'private' || from.ownerId !== viewerId) return { ok: false, status: 403, code: 'NOT_YOUR_BRIEF', message: "Only a brief's owner can take its findings to a team thread." }
  const to = s.threads.find((t) => t.id === toThreadId)
  if (!to || !canSeeThread(viewerId, to)) return { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }
  if (to.visibility !== 'internal') return { ok: false, status: 400, code: 'NOT_A_TEAM_THREAD', message: 'Findings go to a team thread; a client hears from you through a draft.' }
  if (!to.memberIds.includes(viewerId) || !can(viewerId, 'post_firm')) return { ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'Only members can post in that thread.' }
  const existing = s.messages.find((m): m is Carried => m.kind === 'carried' && m.threadId === to.id && m.findingId === finding.id)
  if (existing) return { ok: true, message: existing, created: false }
  const { agentId, at, claim, figures, citations, attention } = finding
  const message: Carried = {
    kind: 'carried', id: nextId('msg'), threadId: to.id, at: nextAt(), carriedBy: viewerId, fromThreadId: from.id, findingId: finding.id,
    finding: { agentId, at, claim, figures, citations, attention },
  }
  s.messages.push(message)
  return { ok: true, message, created: true }
}
```

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/agents/__tests__/ src/mocks/workspace/__tests__/ src/mocks/data/__tests__/workspace-seed.test.ts src/mocks/handlers/__tests__/workspace-agents.test.ts src/workspace/__tests__/context.test.tsx`
Expected: PASS. If the Brief's first ranked finding is not the Drift Monitor's US Equity breach, stop and report it.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`. The Brief thread now shows the seeded findings with the existing finding view; its summary renders from Task 10.

```bash
git add src/mocks/agents/harvest-scanner.ts src/mocks/agents/registry.ts src/mocks/workspace/run-key.ts src/mocks/workspace/run-agent.ts src/mocks/workspace/brief.ts src/mocks/workspace/carry.ts src/mocks/data/workspace-seed.ts src/mocks/data/workspace-store.ts src/mocks/agents/__tests__/harvest-scanner.test.ts src/mocks/workspace/__tests__/brief.test.ts src/mocks/workspace/__tests__/carry.test.ts src/workspace/__tests__/context.test.tsx
git commit -m "feat(engine): Harvest Scanner, a Brief ready on load, and carrying a finding to the team thread"
```

### Task 7: The Proposal Agent and proposal operations

**Files:**
- Create: `src/mocks/agents/proposal-agent.ts`, `src/mocks/workspace/proposals.ts`
- Modify: `src/mocks/data/workspace-seed.ts` (Johnson thread gains the Proposal Agent), `src/mocks/workspace/run-agent.ts` (a drafting agent is not run), `src/workspace/context/AskAgents.tsx` (only finding agents get "Ask …" run buttons), `src/mocks/data/__tests__/workspace-seed.test.ts`, `src/workspace/__tests__/context.test.tsx` (the Johnson "Who can see" list gains the Proposal Agent)
- Test: `src/mocks/workspace/__tests__/proposals.test.ts`

**Interfaces:**
- Consumes: Task 4 `buildVersion`, `editSummary`, `normaliseConstraints`, `normaliseEdits`; Task 5 `visibleProposal`; Task 1 store functions.
- Produces:

```ts
// src/mocks/agents/proposal-agent.ts
export function agentConstraints(requested: readonly ProposalConstraint[]): ProposalConstraint[]   // always adds avoid_self_wash, normalised
export function proposalTitle(accountId: string): string                                           // "Johnson rebalance"
export function draftSummary(accountId: string): string                                            // digit-free
export function revisionSummary(constraints: readonly ProposalConstraint[], built: DraftPreview, previousHadEdits: boolean): string  // digit-free
// src/mocks/workspace/proposals.ts
export type ProposalFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export function createProposal(viewerId: string, threadId: string, accountId: string): { ok: true; detail: ProposalDetail; created: boolean } | ProposalFailure
export function reviseProposal(viewerId: string, proposalId: string, constraints: readonly ProposalConstraint[]): { ok: true; detail: ProposalDetail } | ProposalFailure
export function saveVersion(viewerId: string, proposalId: string, edits: readonly LegEdit[]): { ok: true; detail: ProposalDetail } | ProposalFailure
export function previewEdits(viewerId: string, proposalId: string, edits: readonly LegEdit[]): { ok: true; preview: DraftPreview } | ProposalFailure
export function readableProposals(viewerId: string, threadId?: string): ProposalDetail[] | undefined  // undefined: 404 (client viewer or hidden thread)
```

v1 is posted as a `proposal` message (the embed). Every later version is a `proposal_version` line: an agent revision carries the agent's summary, a workbench save the editor's. An agent revision starts from the agent's legs under the new constraints; workbench edits on the previous version are not carried, and its summary says so. A person version keeps the latest version's constraints and replaces its edits.

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/workspace/__tests__/proposals.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { agentConstraints, draftSummary, revisionSummary } from '@/mocks/agents/proposal-agent'
import { buildVersion } from '../proposal-engine'
import { createProposal, previewEdits, readableProposals, reviseProposal, saveVersion } from '../proposals'
import { runAgent } from '../run-agent'

const create = () => {
  const r = createProposal('user-001', 'th-johnson-review', 'acc-002')
  if (!r.ok) throw new Error(r.message)
  return r.detail
}

describe('asking the Proposal Agent', () => {
  beforeEach(() => resetWorkspaceStore())

  it('drafts v1 in the team thread as an embed; asking again returns the same proposal', () => {
    const detail = create()
    expect(detail).toMatchObject({ id: 'prop-0001', title: 'Johnson rebalance', accountId: 'acc-002', clientId: 'cli-001', threadId: 'th-johnson-review' })
    const v1 = detail.versions[0]!
    expect(v1).toMatchObject({ n: 1, author: { kind: 'agent', agentId: 'proposal' }, constraints: [{ kind: 'avoid_self_wash' }], edits: [] })
    expect(v1.changeSummary).toBe("Drafted a tax-aware rebalance toward the Growth model. It sells losses first, then the lots that cost the least tax, and buys nothing that would wash one of the taxpayer's losses.")
    expect(detail.approval).toEqual({ kind: 'unapproved', latestVersion: 1 })
    const posted = store().messages.filter((m) => m.kind === 'proposal')
    expect(posted).toEqual([expect.objectContaining({ threadId: 'th-johnson-review', agentId: 'proposal', proposalId: 'prop-0001', at: v1.createdAt })])
    const again = createProposal('user-001', 'th-johnson-review', 'acc-002')
    expect(again).toMatchObject({ ok: true, created: false, detail: { id: 'prop-0001' } })
    expect(store().messages.filter((m) => m.kind === 'proposal')).toHaveLength(1)
  })

  it.each([
    ['cli-001', 'th-johnson-review', 'acc-002', 404],
    ['cco-001', 'th-johnson-review', 'acc-002', 403],
    ['user-001', 'th-brief', 'acc-002', 403],
    ['user-001', 'th-robert', 'acc-002', 400],
    ['user-001', 'th-johnson-review', 'acc-001', 400],
    ['user-001', 'th-nowhere', 'acc-002', 404],
  ] as const)('%s asking on %s for %s → %s', (viewer, thread, account, status) => {
    expect(createProposal(viewer, thread, account)).toMatchObject({ ok: false, status })
    expect(store().proposals).toEqual([])
  })

  it('a drafting agent is not run like a finding agent', () => {
    expect(runAgent('user-001', 'th-johnson-review', 'proposal')).toMatchObject({ ok: false, status: 400, code: 'NO_FINDINGS' })
  })
})

describe('revising under constraints', () => {
  beforeEach(() => resetWorkspaceStore())

  it('posts v2 as a version line with a digit-free change summary', () => {
    const { id } = create()
    const r = reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    if (!r.ok) throw new Error(r.message)
    const v2 = r.detail.versions[1]!
    expect(v2).toMatchObject({ n: 2, author: { kind: 'agent', agentId: 'proposal' }, constraints: [{ kind: 'avoid_self_wash' }, { kind: 'harvest_only' }], edits: [] })
    expect(v2.changeSummary).toMatch(/^Revised to sell only lots at a loss\. /)
    expect(v2.changeSummary).toContain('US Equity')
    expect(v2.changeSummary).not.toMatch(/\d/)
    const line = store().messages[store().messages.length - 1]!
    expect(line).toMatchObject({ kind: 'proposal_version', proposalId: id, version: 2, author: { kind: 'agent', agentId: 'proposal' }, changeSummary: v2.changeSummary })
  })

  it('refuses a revision that changes nothing, and bad requests', () => {
    const { id } = create()
    expect(reviseProposal('user-001', id, [])).toMatchObject({ ok: false, status: 409, code: 'NO_CHANGE' })
    expect(reviseProposal('cli-001', id, [{ kind: 'harvest_only' }])).toMatchObject({ ok: false, status: 404 })
    expect(reviseProposal('user-001', 'prop-9999', [{ kind: 'harvest_only' }])).toMatchObject({ ok: false, status: 404 })
  })
})

describe('workbench versions', () => {
  beforeEach(() => resetWorkspaceStore())

  it('saves the edits on top of the latest constraints as a person version, and says what changed', () => {
    const { id } = create()
    reviseProposal('user-001', id, [{ kind: 'cap_realised_gains', usd: 50_000 }])
    const r = saveVersion('user-001', id, [{ kind: 'exclude', symbol: 'QAI' }])
    if (!r.ok) throw new Error(r.message)
    const v3 = r.detail.versions[2]!
    expect(v3).toMatchObject({ n: 3, author: { kind: 'person', personId: 'user-001' }, constraints: [{ kind: 'avoid_self_wash' }, { kind: 'cap_realised_gains', usd: 50_000 }], edits: [{ kind: 'exclude', symbol: 'QAI' }] })
    expect(v3.changeSummary).toBe('Workbench edits: excluded IQ Hedge Multi-Strategy Tracker ETF.')
    expect(store().messages[store().messages.length - 1]).toMatchObject({ kind: 'proposal_version', version: 3, author: { kind: 'person', personId: 'user-001' } })
  })

  it('each saved version equals a fresh engine run on its constraints and edits', () => {
    const { id } = create()
    reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    const r = saveVersion('user-001', id, [{ kind: 'quantity', symbol: 'INTC', quantity: 6_000 }])
    if (!r.ok) throw new Error(r.message)
    for (const v of r.detail.versions) {
      const fresh = buildVersion('acc-002', v.constraints, v.edits)
      if (!fresh.ok) throw new Error(fresh.message)
      expect({ preview: v.preview, pretrade: v.pretrade, legFacts: v.legFacts, excludedLegs: v.excludedLegs, summary: v.summary, fingerprint: v.fingerprint }).toEqual(fresh.built)
    }
  })

  it('refuses invalid edits, an unchanged version, and non-members; a preview changes nothing', () => {
    const { id } = create()
    expect(saveVersion('user-001', id, [{ kind: 'exclude', symbol: 'MSFT' }])).toMatchObject({ ok: false, status: 400, code: 'NOT_A_LEG' })
    expect(saveVersion('user-001', id, [{ kind: 'quantity', symbol: 'INTC', quantity: 0 }])).toMatchObject({ ok: false, status: 400, code: 'BAD_QUANTITY' })
    expect(saveVersion('user-001', id, [])).toMatchObject({ ok: false, status: 409, code: 'NO_CHANGE' })
    expect(saveVersion('cco-001', id, [{ kind: 'exclude', symbol: 'QAI' }])).toMatchObject({ ok: false, status: 403 })
    const messages = store().messages.length
    const preview = previewEdits('cco-001', id, [{ kind: 'exclude', symbol: 'QAI' }])
    expect(preview.ok).toBe(true)
    expect(previewEdits('cli-001', id, [])).toMatchObject({ ok: false, status: 404 })
    expect(store().messages).toHaveLength(messages)
    expect(store().proposals[0]!.versions).toHaveLength(1)
  })

  it('lists proposals for firm viewers who can see the thread, and nothing for a client', () => {
    const { id } = create()
    expect(readableProposals('cco-001', 'th-johnson-review')?.map((p) => p.id)).toEqual([id])
    expect(readableProposals('user-001')?.map((p) => p.id)).toEqual([id])
    expect(readableProposals('cli-001')).toBeUndefined()
    expect(readableProposals('cli-001', 'th-johnson-review')).toBeUndefined()
    expect(readableProposals('user-001', 'th-robert')).toBeUndefined()
  })
})

describe('the Proposal Agent over the whole book', () => {
  it.each(accounts.map((a) => a.id))('%s: digit-free summaries, and no buy that washes one of the taxpayer\'s losses', (id) => {
    expect(draftSummary(id)).not.toMatch(/\d/)
    for (const requested of [[], [{ kind: 'harvest_only' as const }]]) {
      const built = buildVersion(id, agentConstraints(requested), [])
      if (!built.ok) throw new Error(built.message)
      for (const leg of built.built.preview.trades.filter((t) => t.side === 'buy')) expect(leg.washSaleRisk).toBe(false)
      expect(revisionSummary(agentConstraints(requested), built.built, false)).not.toMatch(/\d/)
    }
  })
})
```

In `src/mocks/data/__tests__/workspace-seed.test.ts` the internal thread's agents become `['drift-monitor', 'pretrade-check', 'proposal']`. In `src/workspace/__tests__/context.test.tsx`, "lists the members, compliance supervision and the agents with their scopes" ends with `expect.stringMatching(/^Proposal Agent/)` after Pre-trade Check.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/workspace/__tests__/proposals.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: The Proposal Agent's words**

```ts
// src/mocks/agents/proposal-agent.ts
import type { DraftPreview, ProposalConstraint } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { normaliseConstraints } from '@/mocks/workspace/proposal-engine'
import { ASSET_CLASS_LABELS } from '@/lib/labels'

const hasDigit = (text: string) => /\d/.test(text)

const label = (assetClass: string): string => {
  const name = ASSET_CLASS_LABELS[assetClass]
  if (!name) throw new Error(`Proposal Agent: no display name for asset class "${assetClass}"`)
  return name
}

const joinWords = (words: readonly string[]): string =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`

/** The agent never drafts a buy that would wash one of the taxpayer's losses, whatever else is asked. */
export function agentConstraints(requested: readonly ProposalConstraint[]): ProposalConstraint[] {
  return normaliseConstraints([{ kind: 'avoid_self_wash' }, ...requested])
}

export function proposalTitle(accountId: string): string {
  const account = accounts.find((a) => a.id === accountId)
  const client = clients.find((c) => c.id === account?.clientId)
  if (!account || !client) throw new Error(`Proposal Agent: no client for ${accountId}`)
  return `${client.lastName} rebalance`
}

export function draftSummary(accountId: string): string {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`Proposal Agent: unknown account ${accountId}`)
  const model = modelDisplayName(computeDriftForAccount(account).modelId)
  const toward = hasDigit(model) ? 'its model' : `the ${model} model`
  return `Drafted a tax-aware rebalance toward ${toward}. It sells losses first, then the lots that cost the least tax, and buys nothing that would wash one of the taxpayer's losses.`
}

export function revisionSummary(constraints: readonly ProposalConstraint[], built: DraftPreview, previousHadEdits: boolean): string {
  const asked = constraints.flatMap((c): string[] => {
    switch (c.kind) {
      case 'harvest_only': return ['sell only lots at a loss']
      case 'cap_realised_gains': return ['cap the gains it realises']
      case 'exclude_asset_class': return [`leave ${label(c.assetClass)} untouched`]
      case 'avoid_self_wash': return []
    }
  })
  const opening = asked.length > 0 ? `Revised to ${joinWords(asked)}.` : 'Revised with no constraint beyond avoiding self-washing buys.'
  const { driftTolerance, assetClassDrifts, withinBand } = built.preview.projectedDrift
  const outside = assetClassDrifts.filter((d) => Math.abs(d.drift) > driftTolerance).map((d) => label(d.assetClass))
  const result = withinBand || outside.length === 0
    ? ' Every asset class ends inside its band.'
    : ` ${joinWords(outside)} ${outside.length === 1 ? 'stays outside its band' : 'stay outside their bands'}.`
  const carried = previousHadEdits ? ' Workbench edits on the previous version are not carried into this one.' : ''
  return `${opening}${result}${carried}`
}
```

- [ ] **Step 4: The operations**

```ts
// src/mocks/workspace/proposals.ts
import type { Message, Thread } from '@/types/workspace'
import type { DraftPreview, LegEdit, Proposal, ProposalConstraint, ProposalDetail, ProposalVersion } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { can, personById } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { detailOf, latestVersion, nextProposalId, proposalsInThread } from '@/mocks/data/proposals-store'
import { agentConstraints, draftSummary, proposalTitle, revisionSummary } from '@/mocks/agents/proposal-agent'
import { buildVersion, editSummary, normaliseConstraints, normaliseEdits } from './proposal-engine'
import { visibleProposal } from './proposal-acts'
import { canSeeThread } from './visibility'

export type ProposalFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
const refuse = (status: ProposalFailure['status'], code: string, message: string): ProposalFailure => ({ ok: false, status, code, message })

const NOT_FOUND = refuse(404, 'NO_PROPOSAL', 'Proposal not found.')

/** A firm thread the viewer can see and post in, with the Proposal Agent on it. */
function draftingThread(viewerId: string, threadId: string): { ok: true; thread: Thread } | ProposalFailure {
  const thread = store().threads.find((t) => t.id === threadId)
  if (!thread || !canSeeThread(viewerId, thread)) return refuse(404, 'NO_THREAD', 'Thread not found.')
  if (thread.visibility === 'client') return refuse(400, 'CLIENT_THREAD', 'Agents never post in a client thread.')
  if (!thread.agentIds.includes('proposal')) return refuse(403, 'NOT_ON_THREAD', 'The Proposal Agent is not on this thread.')
  const member = thread.memberIds.includes(viewerId) || thread.ownerId === viewerId
  if (!member || !can(viewerId, 'post_firm')) return refuse(403, 'NOT_A_MEMBER', 'Only members of the thread can work on its proposals.')
  return { ok: true, thread }
}

function append(proposal: Proposal, version: Omit<ProposalVersion, 'n' | 'createdAt'>): ProposalDetail {
  const at = nextAt()
  const n = latestVersion(proposal).n + 1
  proposal.versions.push({ ...version, n, createdAt: at })
  const line: Message = { kind: 'proposal_version', id: nextId('msg'), threadId: proposal.threadId, at, proposalId: proposal.id, version: n, author: version.author, changeSummary: version.changeSummary }
  store().messages.push(line)
  return detailOf(proposal)
}

export function createProposal(viewerId: string, threadId: string, accountId: string): { ok: true; detail: ProposalDetail; created: boolean } | ProposalFailure {
  const guard = draftingThread(viewerId, threadId)
  if (!guard.ok) return guard
  const { thread } = guard
  if (thread.subject?.type !== 'account' || thread.subject.id !== accountId) return refuse(400, 'NOT_THE_SUBJECT', "A proposal here is for the thread's own account.")
  const existing = proposalsInThread(thread.id).find((p) => p.accountId === accountId)
  if (existing) return { ok: true, detail: detailOf(existing), created: false }
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return refuse(404, 'NO_ACCOUNT', 'Account not found.')
  const constraints = agentConstraints([])
  const built = buildVersion(accountId, constraints, [])
  if (!built.ok) return refuse(400, built.code, built.message)
  const at = nextAt()
  const proposal: Proposal = {
    id: nextProposalId(), title: proposalTitle(accountId), accountId, clientId: account.clientId, threadId: thread.id,
    versions: [{ n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: at, constraints, edits: [], changeSummary: draftSummary(accountId), ...built.built }],
  }
  const s = store()
  s.proposals.push(proposal)
  s.messages.push({ kind: 'proposal', id: nextId('msg'), threadId: thread.id, agentId: 'proposal', at, proposalId: proposal.id })
  return { ok: true, detail: detailOf(proposal), created: true }
}

export function reviseProposal(viewerId: string, proposalId: string, requested: readonly ProposalConstraint[]): { ok: true; detail: ProposalDetail } | ProposalFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const guard = draftingThread(viewerId, proposal.threadId)
  if (!guard.ok) return guard
  const latest = latestVersion(proposal)
  const constraints = agentConstraints(requested)
  if (latest.edits.length === 0 && JSON.stringify(constraints) === JSON.stringify(normaliseConstraints(latest.constraints))) {
    return refuse(409, 'NO_CHANGE', `v${latest.n} already has those constraints.`)
  }
  const built = buildVersion(proposal.accountId, constraints, [])
  if (!built.ok) return refuse(400, built.code, built.message)
  return {
    ok: true,
    detail: append(proposal, {
      author: { kind: 'agent', agentId: 'proposal' }, constraints, edits: [],
      changeSummary: revisionSummary(constraints, built.built, latest.edits.length > 0), ...built.built,
    }),
  }
}

export function saveVersion(viewerId: string, proposalId: string, edits: readonly LegEdit[]): { ok: true; detail: ProposalDetail } | ProposalFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const guard = draftingThread(viewerId, proposal.threadId)
  if (!guard.ok) return guard
  const latest = latestVersion(proposal)
  const built = buildVersion(proposal.accountId, latest.constraints, edits)
  if (!built.ok) return refuse(400, built.code, built.message)
  if (built.built.fingerprint === latest.fingerprint) return refuse(409, 'NO_CHANGE', `Nothing differs from v${latest.n}.`)
  return {
    ok: true,
    detail: append(proposal, {
      author: { kind: 'person', personId: viewerId }, constraints: latest.constraints, edits: normaliseEdits(edits),
      changeSummary: editSummary(edits, built.names), ...built.built,
    }),
  }
}

/** What the edits would make of the latest version, saved nowhere. Any firm viewer who can see the proposal may look. */
export function previewEdits(viewerId: string, proposalId: string, edits: readonly LegEdit[]): { ok: true; preview: DraftPreview } | ProposalFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const built = buildVersion(proposal.accountId, latestVersion(proposal).constraints, edits)
  return built.ok ? { ok: true, preview: built.built } : refuse(400, built.code, built.message)
}

export function readableProposals(viewerId: string, threadId?: string): ProposalDetail[] | undefined {
  if (!personById(viewerId) || personById(viewerId)?.role === 'client') return undefined
  const s = store()
  if (threadId !== undefined) {
    const thread = s.threads.find((t) => t.id === threadId)
    if (!thread || thread.visibility === 'client' || !canSeeThread(viewerId, thread)) return undefined
    return proposalsInThread(thread.id).map(detailOf)
  }
  return s.proposals.filter((p) => visibleProposal(viewerId, p.id) !== undefined).map(detailOf)
}
```

- [ ] **Step 5: Seed, run-agent, AskAgents**

`workspace-seed.ts`: the Johnson Rebalance Review's `agentIds` become `['drift-monitor', 'pretrade-check', 'proposal']`.

`run-agent.ts`, in `resolveRun`, before the `NOT_ON_THREAD` check:

```ts
  if (!agent && thread.agentIds.includes(agentId)) {
    return { ok: false, status: 400, code: 'NO_FINDINGS', message: 'This agent does not report findings; ask it through its own controls.' }
  }
```

`AskAgents.tsx`: the run buttons are for finding agents only — `const runnable = agents.filter((a) => a.produces === 'findings')`, map `runnable` instead of `agents`, and return `null` when `runnable` is empty. (Task 11 adds the Proposal Agent's own control.)

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/workspace/__tests__/ src/mocks/data/__tests__/workspace-seed.test.ts src/mocks/handlers/__tests__/workspace-agents.test.ts src/workspace/__tests__/context.test.tsx`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/agents/proposal-agent.ts src/mocks/workspace/proposals.ts src/mocks/data/workspace-seed.ts src/mocks/workspace/run-agent.ts src/workspace/context/AskAgents.tsx src/mocks/workspace/__tests__/proposals.test.ts src/mocks/data/__tests__/workspace-seed.test.ts src/workspace/__tests__/context.test.tsx
git commit -m "feat(engine): the Proposal Agent drafts and revises; workbench versions and previews"
```

### Task 8: The Client Letter Agent and letter drafts

**Files:**
- Create: `src/mocks/agents/client-letter.ts`, `src/mocks/workspace/letters.ts`
- Test: `src/mocks/agents/__tests__/client-letter.test.ts`, `src/mocks/workspace/__tests__/letters.test.ts`

**Interfaces:**
- Consumes: Task 1 `isDraftStale`, `activeApproval`; Task 5 `approveProposal`, `visibleProposal`; Task 7 `createProposal`, `reviseProposal`; `clientMoney`, `clientDate`, `clientPercent` from `@/kit/measure`; `RATE_DISCLOSURE` from `@/lib/tax-rules`; `taxEstimateDirection` from `@/lib/capital-gains`; Task 6 `taxpayerHeldAway`.
- Produces:

```ts
// src/mocks/agents/client-letter.ts
export type ClientLetter = { body: string; figures: Figure[] }
export function writeClientLetter(proposal: Proposal, version: ProposalVersion, signedBy: string): ClientLetter
// src/mocks/workspace/letters.ts
export type LetterFailure = { ok: false; status: 400 | 404 | 409; code: string; message: string }
export function draftLetter(viewerId: string, clientThreadId: string, proposalId: string): { ok: true; draft: Draft; created: boolean } | LetterFailure
export function reviseDraft(viewerId: string, clientThreadId: string, draftId: string, body: string): { ok: true; draft: Draft } | LetterFailure
/** A client thread's drafts as a firm viewer sees them: each marked stale when its basis is no longer the approval. */
export function draftsFor(clientThreadId: string): Draft[]
```

The letter is written from the **approved** version only, signed by its approver, and tied to `{ proposalId, version, fingerprint }`. It says what changes and why in plain language; the loss each harvested sale realises and the last date it must not be bought back (`repurchaseBlockedUntil`, inclusive) and the first date it may; that dividend reinvestment and accounts the firm does not manage (named from the taxpayer's held-away accounts) can also count as buying back; the return-level estimate against this year's results; and `RATE_DISCLOSURE` verbatim (estimates, not tax advice; federal rates with NIIT; state tax not modelled). Its figures are recorded on the draft so a test can tie them to the version.

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/agents/__tests__/client-letter.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore } from '@/mocks/data/workspace-store'
import { createProposal } from '@/mocks/workspace/proposals'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { clientDate, clientMoney, clientPercent } from '@/kit/measure'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { accounts } from '@/mocks/data/accounts'
import { writeClientLetter } from '../client-letter'

describe('the Client Letter Agent', () => {
  beforeEach(() => resetWorkspaceStore())
  const v1Letter = () => {
    const r = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!r.ok) throw new Error(r.message)
    const v1 = r.detail.versions[0]!
    return { v1, letter: writeClientLetter(r.detail, v1, 'user-001') }
  }

  it("figures are the version's figures: the INTC loss, the return-level estimate, and the drift that prompted it", () => {
    const { v1, letter } = v1Letter()
    const intc = v1.preview.trades.find((t) => t.symbol === 'INTC')!
    const drift = computeDriftForAccount(accounts.find((a) => a.id === 'acc-002')!)
    const usEquity = drift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!
    expect(letter.figures).toEqual([
      { label: 'US stocks before the rebalance', value: usEquity.actual, unit: '%', source: 'drift.assetClassDrifts.actual' },
      { label: 'US stocks target', value: usEquity.target, unit: '%', source: 'drift.assetClassDrifts.target' },
      { label: 'INTC loss', value: intc.realisedShortTerm + intc.realisedLongTerm, unit: 'USD', source: 'version.preview.trades.INTC realised, less any washed part' },
      { label: 'Estimated tax on the return', value: v1.preview.estimatedTaxImpact, unit: 'USD', source: 'version.preview.estimatedTaxImpact' },
    ])
    expect(letter.body).toContain(`${clientPercent(usEquity.actual)} of the account against a ${clientPercent(usEquity.target)} target`)
  })

  it('states the loss, the last day not to buy back, DRIP and held-away accounts, the estimate and the disclosure', () => {
    const { letter } = v1Letter()
    expect(letter.body.startsWith('Dear Robert,')).toBe(true)
    expect(letter.body).toContain(`realises a loss of ${clientMoney(45_850)}`)
    expect(letter.body).toContain(`on or before ${clientDate('2026-03-27')}`)
    expect(letter.body).toContain(`From ${clientDate('2026-03-28')} you may buy it again.`)
    expect(letter.body).toContain("in any of your accounts or Patricia's, including IRAs")
    expect(letter.body).toContain('dividends set to reinvest automatically')
    expect(letter.body).toContain("your Vanguard 401(k) and Patricia's TIAA 403(b)")
    expect(letter.body).toContain(`about ${clientMoney(10_422)} of federal capital-gains tax added to your joint return for 2026`)
    expect(letter.body).toContain(RATE_DISCLOSURE)
    expect(letter.body).toContain('with our compliance team for review before any is placed')
    expect(letter.body.endsWith('Adrian Hale')).toBe(true)
    expect(letter.body).not.toMatch(/cleared|household/i)
  })
})
```

```ts
// src/mocks/workspace/__tests__/letters.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { createProposal, reviseProposal } from '../proposals'
import { approveProposal } from '../proposal-acts'
import { sendToClient } from '../acts'
import { draftLetter, draftsFor, reviseDraft } from '../letters'

function approvedJohnson() {
  const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
  if (!created.ok) throw new Error(created.message)
  const v1 = created.detail.versions[0]!
  const approved = approveProposal('user-001', created.detail.id, 1, v1.fingerprint)
  if (!approved.ok) throw new Error(approved.message)
  return { id: created.detail.id, v1 }
}

describe('letter drafts', () => {
  beforeEach(() => resetWorkspaceStore())

  it('needs an approved version', () => {
    const created = createProposal('user-001', 'th-johnson-review', 'acc-002')
    if (!created.ok) throw new Error(created.message)
    expect(draftLetter('user-001', 'th-robert', created.detail.id)).toMatchObject({ ok: false, status: 409, code: 'NO_APPROVED_VERSION' })
  })

  it('drafts into the firm-only drafts panel, tied to the approved version; asking again returns it', () => {
    const { id, v1 } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    expect(r.created).toBe(true)
    expect(r.draft).toMatchObject({ clientThreadId: 'th-robert', authorId: 'user-001', agentId: 'client-letter', basis: { proposalId: id, version: 1, fingerprint: v1.fingerprint } })
    expect(draftLetter('user-001', 'th-robert', id)).toMatchObject({ ok: true, created: false, draft: { id: r.draft.id } })
    expect(store().drafts).toHaveLength(1)
    expect(store().messages.some((m) => m.threadId === 'th-robert' && m.kind !== 'text')).toBe(false)
  })

  it('a client, an analyst, a team thread and another client are refused', () => {
    const { id } = approvedJohnson()
    expect(draftLetter('cli-001', 'th-robert', id)).toMatchObject({ ok: false, status: 404 })
    expect(draftLetter('user-003', 'th-robert', id)).toMatchObject({ ok: false, status: 404 })
    expect(draftLetter('user-001', 'th-johnson-review', id)).toMatchObject({ ok: false, status: 400 })
    expect(draftLetter('user-002', 'th-robert', id).ok).toBe(true)
  })

  it('goes stale when the approval moves on, and send refuses it', () => {
    const { id } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    expect(draftsFor('th-robert')[0]!.stale).toBe(false)
    const revised = reviseProposal('user-001', id, [{ kind: 'harvest_only' }])
    if (!revised.ok) throw new Error(revised.message)
    expect(draftsFor('th-robert')[0]!.stale).toBe(false)
    approveProposal('user-001', id, 2, revised.detail.versions[1]!.fingerprint)
    expect(draftsFor('th-robert')[0]!.stale).toBe(true)
    expect(sendToClient('user-001', r.draft.id)).toMatchObject({ ok: false, status: 409, code: 'STALE_DRAFT' })
    const fresh = draftLetter('user-001', 'th-robert', id)
    expect(fresh).toMatchObject({ ok: true, created: true, draft: { basis: { version: 2 } } })
  })

  it('an edit replaces the draft, keeps its basis, and is what gets sent', () => {
    const { id } = approvedJohnson()
    const r = draftLetter('user-001', 'th-robert', id)
    if (!r.ok) throw new Error(r.message)
    const edited = reviseDraft('user-001', 'th-robert', r.draft.id, `${r.draft.body}\n\nP.S. Call me any time.`)
    if (!edited.ok) throw new Error(edited.message)
    expect(edited.draft).toMatchObject({ supersedes: r.draft.id, basis: r.draft.basis, agentId: 'client-letter', authorId: 'user-001' })
    expect(edited.draft.figures).toBeUndefined()
    expect(draftsFor('th-robert').map((d) => d.id)).toEqual([edited.draft.id])
    expect(reviseDraft('user-001', 'th-robert', edited.draft.id, '  ')).toMatchObject({ ok: false, status: 400 })
    expect(reviseDraft('cli-001', 'th-robert', edited.draft.id, 'x')).toMatchObject({ ok: false, status: 404 })
    const sent = sendToClient('user-001', edited.draft.id)
    expect(sent.ok).toBe(true)
    const robertSees = store().messages.filter((m) => m.threadId === 'th-robert' && m.kind === 'text').map((m) => (m.kind === 'text' ? m.body : ''))
    expect(robertSees[robertSees.length - 1]).toContain('P.S. Call me any time.')
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/agents/__tests__/client-letter.test.ts src/mocks/workspace/__tests__/letters.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the letter**

```ts
// src/mocks/agents/client-letter.ts
import type { Figure } from '@/types/workspace'
import type { AssetClass } from '@/types/portfolio'
import type { ProposedTrade } from '@/services/oms'
import type { Proposal, ProposalVersion } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { sameWashSaleTaxpayer, taxReturnFor, washSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { taxpayerHeldAway } from './harvest-scanner'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { taxEstimateDirection } from '@/lib/capital-gains'
import { isSubjectToWashSale } from '@/lib/security-master'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { clientDate, clientMoney, clientPercent } from '@/kit/measure'

export type ClientLetter = { body: string; figures: Figure[] }

/** Asset classes as a client reads them. */
const CLIENT_WORDS: Readonly<Record<AssetClass, string>> = {
  us_equity: 'US stocks', intl_equity: 'international stocks', emerging_markets: 'emerging-market stocks', fixed_income: 'bonds',
  alternatives: 'alternative strategies', real_estate: 'real estate', commodities: 'commodities', cash: 'cash',
  digital_assets: 'digital-asset funds', private_equity: 'private equity',
}

const ACCOUNT_WORDS: Readonly<Partial<Record<string, string>>> = { individual: 'individual account', joint: 'joint account' }

const joinWords = (words: readonly string[]): string =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
const capitalise = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const dayAfter = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
const security = (t: Pick<ProposedTrade, 'name' | 'symbol'>) => `${t.name} (${t.symbol})`
const recognised = (t: ProposedTrade) => t.realisedShortTerm + t.realisedLongTerm - ((t.washedLoss?.shortTerm ?? 0) + (t.washedLoss?.longTerm ?? 0))

/**
 * The client's message about an approved version, in plain language. Every figure is the version's
 * (or the drift that prompted it), formatted only by the kit's client formatters, and recorded in
 * `figures` beside the text.
 */
export function writeClientLetter(proposal: Proposal, version: ProposalVersion, signedBy: string): ClientLetter {
  const account = accounts.find((a) => a.id === proposal.accountId)
  const client = clients.find((c) => c.id === proposal.clientId)
  const signer = personById(signedBy)
  if (!account || !client || !signer) throw new Error(`Client Letter Agent: cannot address ${proposal.id}`)
  const drift = computeDriftForAccount(account)
  const worst = drift.assetClassDrifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
  const trades = version.preview.trades
  const sells = trades.filter((t) => t.side === 'sell')
  const buys = trades.filter((t) => t.side === 'buy')
  const figures: Figure[] = [
    { label: `${CLIENT_WORDS[worst.assetClass]} before the rebalance`, value: worst.actual, unit: '%', source: 'drift.assetClassDrifts.actual' },
    { label: `${CLIENT_WORDS[worst.assetClass]} target`, value: worst.target, unit: '%', source: 'drift.assetClassDrifts.target' },
  ]
  const accountWords = ACCOUNT_WORDS[account.type] ?? `account ${account.name}`
  const paragraphs = [
    `Dear ${client.firstName},`,
    `We have approved a rebalance of your ${accountWords} to bring it back in line with its ${modelDisplayName(drift.modelId)} model. `
      + `${capitalise(CLIENT_WORDS[worst.assetClass])} had grown to ${clientPercent(worst.actual)} of the account against a ${clientPercent(worst.target)} target, `
      + 'so we are selling some holdings and adding to the areas below their targets.',
    [
      sells.length > 0 ? `We are selling ${joinWords(sells.map(security))}` : '',
      buys.length > 0 ? `${sells.length > 0 ? ', and buying' : 'We are buying'} ${joinWords(buys.map(security))}` : '',
    ].join('') + '.',
  ]

  const ownTaxpayer = washSaleTaxpayer(account).startsWith('account:')
  const spouses = ownTaxpayer ? [] : [...new Set(sameWashSaleTaxpayer(account).map((a) => a.clientId))]
    .filter((id) => id !== client.id)
    .flatMap((id) => clients.find((c) => c.id === id)?.firstName ?? [])
  const where = ownTaxpayer ? 'in this account' : spouses.length > 0 ? `in any of your accounts or ${joinWords(spouses.map((n) => `${n}'s`))}, including IRAs` : 'in any of your accounts, including IRAs'
  const harvested = sells.filter((t) => t.repurchaseBlockedUntil !== undefined && isSubjectToWashSale(t.symbol) && recognised(t) < 0)
  for (const t of harvested) {
    const until = t.repurchaseBlockedUntil ?? ''
    figures.push({ label: `${t.symbol} loss`, value: recognised(t), unit: 'USD', source: `version.preview.trades.${t.symbol} realised, less any washed part` })
    paragraphs.push(
      `Selling ${security(t)} realises a loss of ${clientMoney(-recognised(t))}, which can offset gains on your tax return. `
      + `To keep that loss, please do not buy ${t.name} back ${where}, on or before ${clientDate(until)}. From ${clientDate(dayAfter(until))} you may buy it again.`,
    )
  }
  if (harvested.length > 0) {
    const away = taxpayerHeldAway(account).map((h) => {
      const owner = h.clientId === client.id ? 'your' : `${clients.find((c) => c.id === h.clientId)?.firstName ?? 'a family member'}'s`
      return `${owner} ${h.institutionName} ${h.accountType.split(' — ')[0] ?? h.accountType}`
    })
    paragraphs.push(
      'Two things can count as buying it back without anyone placing a trade: dividends set to reinvest automatically, '
      + `and purchases in accounts we do not manage${away.length > 0 ? `, such as ${joinWords(away)}` : ''}. `
      + `Please turn off dividend reinvestment on ${joinWords(harvested.map((t) => t.name))} until then, and check with us before buying it in any account.`,
    )
  }

  if (version.preview.taxable) {
    const { direction, amount } = taxEstimateDirection(version.preview.estimatedTaxImpact)
    figures.push({ label: 'Estimated tax on the return', value: version.preview.estimatedTaxImpact, unit: 'USD', source: 'version.preview.estimatedTaxImpact' })
    const joint = taxReturnFor(account)?.startsWith('joint:') === true
    paragraphs.push(`After netting against the gains and losses already realised this year, we estimate about ${clientMoney(amount)} of federal capital-gains tax ${direction} your ${joint ? 'joint ' : ''}return for ${MOCK_TODAY_ISO.slice(0, 4)}.`)
  } else {
    paragraphs.push('This account is tax-advantaged, so these sales create no taxable gain or loss.')
  }
  paragraphs.push(RATE_DISCLOSURE)
  paragraphs.push('The orders are with our compliance team for review before any is placed.')
  paragraphs.push(signer.name)
  return { body: paragraphs.join('\n\n'), figures }
}
```

- [ ] **Step 4: Letter drafts**

```ts
// src/mocks/workspace/letters.ts
import type { Draft } from '@/types/workspace'
import { can, personById } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { activeApproval, isDraftStale } from '@/mocks/data/proposals-store'
import { writeClientLetter } from '@/mocks/agents/client-letter'
import { visibleProposal } from './proposal-acts'
import { canSeeThread } from './visibility'

export type LetterFailure = { ok: false; status: 400 | 404 | 409; code: string; message: string }
const NO_THREAD: LetterFailure = { ok: false, status: 404, code: 'NO_THREAD', message: 'Thread not found.' }

/** A client thread the viewer may draft in; anyone else is told it does not exist. */
function draftingClientThread(viewerId: string, threadId: string) {
  const thread = store().threads.find((t) => t.id === threadId)
  if (!thread || !canSeeThread(viewerId, thread) || personById(viewerId)?.role === 'client' || !can(viewerId, 'draft_for_client')) return undefined
  return thread
}

export function draftLetter(viewerId: string, clientThreadId: string, proposalId: string): { ok: true; draft: Draft; created: boolean } | LetterFailure {
  const thread = draftingClientThread(viewerId, clientThreadId)
  if (!thread) return NO_THREAD
  if (thread.visibility !== 'client') return { ok: false, status: 400, code: 'NOT_CLIENT_THREAD', message: 'Letters are drafted in a client thread.' }
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return { ok: false, status: 404, code: 'NO_PROPOSAL', message: 'Proposal not found.' }
  if (proposal.clientId !== thread.clientId) return { ok: false, status: 400, code: 'NOT_THIS_CLIENT', message: "That proposal is not for this thread's client." }
  const active = activeApproval(proposal.id)
  if (!active) return { ok: false, status: 409, code: 'NO_APPROVED_VERSION', message: 'Approve a version before asking for the client letter.' }
  const version = proposal.versions.find((v) => v.n === active.version)
  if (!version) throw new Error(`Approval ${active.actId} names a missing version`)
  const basis = { proposalId: proposal.id, version: version.n, fingerprint: version.fingerprint }
  const s = store()
  const existing = s.drafts.find((d) => d.clientThreadId === thread.id && d.agentId === 'client-letter' && !isDraftStale(d)
    && d.basis?.proposalId === basis.proposalId && d.basis.version === basis.version)
  if (existing) return { ok: true, draft: existing, created: false }
  const letter = writeClientLetter(proposal, version, active.approverId)
  const draft: Draft = { id: nextId('draft'), clientThreadId: thread.id, authorId: viewerId, body: letter.body, createdAt: nextAt(), agentId: 'client-letter', basis, figures: letter.figures }
  s.drafts.push(draft)
  return { ok: true, draft, created: true }
}

export function reviseDraft(viewerId: string, clientThreadId: string, draftId: string, body: string): { ok: true; draft: Draft } | LetterFailure {
  const thread = draftingClientThread(viewerId, clientThreadId)
  if (!thread) return NO_THREAD
  const s = store()
  const old = s.drafts.find((d) => d.id === draftId && d.clientThreadId === thread.id)
  if (!old) return { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  if (body.trim().length === 0) return { ok: false, status: 400, code: 'BAD_REQUEST', message: 'A non-empty body is required.' }
  // The edit keeps the letter's basis (so it still goes stale with the approval) but not its figures: the text is now the editor's.
  const draft: Draft = { id: nextId('draft'), clientThreadId: thread.id, authorId: viewerId, body, createdAt: nextAt(), agentId: old.agentId, basis: old.basis, supersedes: old.id }
  s.drafts = s.drafts.map((d) => (d.id === old.id ? draft : d))
  return { ok: true, draft }
}

export function draftsFor(clientThreadId: string): Draft[] {
  return store().drafts.filter((d) => d.clientThreadId === clientThreadId).map((d) => ({ ...d, stale: isDraftStale(d) }))
}
```

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/agents/__tests__/client-letter.test.ts src/mocks/workspace/__tests__/`
Expected: PASS. `clientPercent(0.682)` reads `68.2%`; the letter therefore contains "68.2% of the account against a 55.0% target".

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/agents/client-letter.ts src/mocks/workspace/letters.ts src/mocks/agents/__tests__/client-letter.test.ts src/mocks/workspace/__tests__/letters.test.ts
git commit -m "feat(engine): the Client Letter Agent drafts from the approved version; letters go stale with the approval"
```

### Task 9: API handlers, services and hooks

**Files:**
- Create: `src/mocks/handlers/workspace-http.ts`, `src/mocks/handlers/workspace-proposals.ts`
- Modify: `src/mocks/handlers/workspace.ts`, `src/services/workspace.ts`, `src/hooks/use-workspace.ts`
- Test: `src/mocks/handlers/__tests__/workspace-proposals-api.test.ts`, `src/hooks/__tests__/use-workspace-proposals.test.tsx`

**Interfaces:**
- Consumes: Tasks 5–8 operations.
- Produces — endpoints (viewer from `X-Viewer`; `401` without a known viewer; client viewers `404` on every proposal and letter endpoint):

| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/api/workspace/proposals?threadId=` (threadId optional) | — | `200 ProposalDetail[]` |
| GET | `/api/workspace/proposals/:id` | — | `200 ProposalDetail` |
| POST | `/api/workspace/proposals` | `{ threadId, accountId }` | `201 ProposalDetail` (new) / `200` (already drafted) |
| POST | `/api/workspace/proposals/:id/revise` | `{ constraints }` | `201 ProposalDetail` |
| POST | `/api/workspace/proposals/:id/versions` | `{ edits }` | `201 ProposalDetail` |
| POST | `/api/workspace/proposals/:id/preview` | `{ edits }` | `200 DraftPreview` |
| POST | `/api/workspace/acts` | `{ kind: 'approve_proposal', proposalId, version, fingerprint }` / `{ kind: 'withdraw_approval', proposalId }` / `{ kind: 'send_to_client', draftId }` | `201 BindingAct` |
| GET | `/api/workspace/threads/:id/drafts` | — | `200 Draft[]` with `stale` |
| POST | `/api/workspace/threads/:id/drafts/letter` | `{ proposalId }` | `201 Draft` / `200` (already drafted) |
| POST | `/api/workspace/threads/:id/drafts/:draftId/revisions` | `{ body }` | `201 Draft` |
| POST | `/api/workspace/threads/:id/findings/:messageId/carry` | `{ toThreadId }` | `201 Message` / `200` (already carried) |

```ts
// src/services/workspace.ts (added)
export const getProposals: (viewer: string, threadId?: string) => Promise<ProposalDetail[]>
export const getProposal: (viewer: string, id: string) => Promise<ProposalDetail>
export const createProposal: (viewer: string, threadId: string, accountId: string) => Promise<ProposalDetail>
export const reviseProposal: (viewer: string, id: string, constraints: ProposalConstraint[]) => Promise<ProposalDetail>
export const saveProposalVersion: (viewer: string, id: string, edits: LegEdit[]) => Promise<ProposalDetail>
export const previewProposalEdits: (viewer: string, id: string, edits: LegEdit[]) => Promise<DraftPreview>
export const approveProposal: (viewer: string, proposalId: string, version: number, fingerprint: string) => Promise<BindingAct>
export const withdrawApproval: (viewer: string, proposalId: string) => Promise<BindingAct>
export const carryFinding: (viewer: string, fromThreadId: string, messageId: string, toThreadId: string) => Promise<Message>
export const draftLetter: (viewer: string, clientThreadId: string, proposalId: string) => Promise<Draft>
export const reviseDraft: (viewer: string, clientThreadId: string, draftId: string, body: string) => Promise<Draft>
// src/hooks/use-workspace.ts (added) — keys start ['workspace', viewerId, …]; every mutation invalidates ['workspace'] when it settles
export function useProposals(threadId?: string, enabled?: boolean)          // ['workspace', viewer, 'proposals', threadId ?? 'all']
export function useProposal(id: string)                                     // ['workspace', viewer, 'proposal', id]
export function useProposalPreview(id: string, edits: LegEdit[], enabled: boolean)  // ['workspace', viewer, 'proposal-preview', id, JSON edits], keeps the previous data while refetching
export function useCreateProposal(threadId: string)                         // mutate(accountId)
export function useReviseProposal(proposalId: string)                       // mutate(constraints)
export function useSaveVersion(proposalId: string)                          // mutate(edits)
export function useApproveProposal()                                        // mutate({ proposalId, version, fingerprint })
export function useWithdrawApproval()                                       // mutate(proposalId)
export function useCarryFinding(fromThreadId: string)                       // mutate({ messageId, toThreadId })
export function useDraftLetter(clientThreadId: string)                      // mutate(proposalId)
export function useReviseDraft(clientThreadId: string)                      // mutate({ draftId, body })
```

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/handlers/__tests__/workspace-proposals-api.test.ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string, body?: unknown) {
  const res = await fetch(`/api/workspace${path}`, {
    method, headers: { 'X-Viewer': viewer, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const ask = () => call('POST', '/proposals', 'user-001', { threadId: 'th-johnson-review', accountId: 'acc-002' })

describe('proposal endpoints', () => {
  it('asks the Proposal Agent once: 201, then 200 with the same proposal', async () => {
    const first = await ask()
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({ id: 'prop-0001', approval: { kind: 'unapproved', latestVersion: 1 }, staged: [] })
    const second = await ask()
    expect(second.status).toBe(200)
    expect(second.body.id).toBe('prop-0001')
  })

  it('lists and reads proposals for firm viewers', async () => {
    await ask()
    expect((await call('GET', '/proposals?threadId=th-johnson-review', 'cco-001')).body.map((p: { id: string }) => p.id)).toEqual(['prop-0001'])
    expect((await call('GET', '/proposals', 'user-003')).body).toHaveLength(1)
    expect((await call('GET', '/proposals/prop-0001', 'user-002')).status).toBe(200)
    expect((await call('GET', '/proposals/prop-9999', 'user-001')).status).toBe(404)
  })

  it('a client gets 404 from every proposal and letter endpoint, and no PUT/PATCH/DELETE exists', async () => {
    await ask()
    for (const [method, path, body] of [
      ['GET', '/proposals', undefined], ['GET', '/proposals?threadId=th-johnson-review', undefined], ['GET', '/proposals/prop-0001', undefined],
      ['POST', '/proposals', { threadId: 'th-johnson-review', accountId: 'acc-002' }], ['POST', '/proposals/prop-0001/revise', { constraints: [] }],
      ['POST', '/proposals/prop-0001/versions', { edits: [] }], ['POST', '/proposals/prop-0001/preview', { edits: [] }],
      ['POST', '/threads/th-robert/drafts/letter', { proposalId: 'prop-0001' }],
      ['POST', '/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: 'X' }],
      ['POST', '/acts', { kind: 'withdraw_approval', proposalId: 'prop-0001' }],
    ] as const) {
      expect((await call(method, path, 'cli-001', body)).status, `${method} ${path}`).toBe(404)
    }
    for (const method of ['PUT', 'PATCH', 'DELETE']) expect((await call(method, '/proposals/prop-0001', 'user-001')).status).toBe(405)
  })

  it('revises, saves a version, previews without saving, and validates bodies', async () => {
    await ask()
    expect((await call('POST', '/proposals/prop-0001/revise', 'user-001', { constraints: [{ kind: 'harvest_only' }] })).status).toBe(201)
    expect((await call('POST', '/proposals/prop-0001/revise', 'user-001', { constraints: 'all' })).status).toBe(400)
    const preview = await call('POST', '/proposals/prop-0001/preview', 'user-001', { edits: [{ kind: 'quantity', symbol: 'INTC', quantity: 6000 }] })
    expect(preview.status).toBe(200)
    expect(preview.body.fingerprint).toMatch(/^[0-9A-F]{8}$/)
    expect(store().proposals[0]!.versions).toHaveLength(2)
    const bad = await call('POST', '/proposals/prop-0001/preview', 'user-001', { edits: [{ kind: 'quantity', symbol: 'INTC', quantity: 0 }] })
    expect(bad).toMatchObject({ status: 400, body: { code: 'BAD_QUANTITY' } })
    const saved = await call('POST', '/proposals/prop-0001/versions', 'user-001', { edits: [{ kind: 'quantity', symbol: 'INTC', quantity: 6000 }] })
    expect(saved.status).toBe(201)
    expect(saved.body.versions.map((v: { n: number }) => v.n)).toEqual([1, 2, 3])
  })

  it('approves through the acts endpoint, stages pending compliance, and withdraws', async () => {
    const { body: detail } = await ask()
    const fp = detail.versions[0].fingerprint
    const approved = await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: fp })
    expect(approved).toMatchObject({ status: 201, body: { id: 'REC-0001', kind: 'approve_proposal', version: 1 } })
    expect((await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: fp })).status).toBe(409)
    expect((await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: '1', fingerprint: fp })).status).toBe(400)
    const read = (await call('GET', '/proposals/prop-0001', 'cco-001')).body
    expect(read.approval).toMatchObject({ kind: 'approved', version: 1 })
    expect(read.staged.length).toBeGreaterThan(0)
    expect(read.staged.every((o: { status: string }) => o.status === 'pending_compliance')).toBe(true)
    expect((await call('GET', '/acts?threadId=th-johnson-review', 'cco-001')).body.map((a: { id: string }) => a.id)).toEqual(['REC-0001'])
    expect((await call('POST', '/acts', 'user-001', { kind: 'withdraw_approval', proposalId: 'prop-0001' })).status).toBe(201)
    expect((await call('GET', '/proposals/prop-0001', 'user-001')).body.approval.kind).toBe('unapproved')
  })

  it('drafts the letter, serves staleness, revises a draft, and refuses a stale send', async () => {
    const { body: detail } = await ask()
    await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: detail.versions[0].fingerprint })
    const letter = await call('POST', '/threads/th-robert/drafts/letter', 'user-001', { proposalId: 'prop-0001' })
    expect(letter).toMatchObject({ status: 201, body: { agentId: 'client-letter', basis: { version: 1 } } })
    expect((await call('POST', '/threads/th-robert/drafts/letter', 'user-001', { proposalId: 'prop-0001' })).status).toBe(200)
    const edited = await call('POST', `/threads/th-robert/drafts/${letter.body.id}/revisions`, 'user-001', { body: 'Edited letter.' })
    expect(edited).toMatchObject({ status: 201, body: { supersedes: letter.body.id } })
    expect((await call('GET', '/threads/th-robert/drafts', 'user-001')).body).toEqual([expect.objectContaining({ id: edited.body.id, stale: false })])
    const v2 = await call('POST', '/proposals/prop-0001/revise', 'user-001', { constraints: [{ kind: 'harvest_only' }] })
    await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 2, fingerprint: v2.body.versions[1].fingerprint })
    expect((await call('GET', '/threads/th-robert/drafts', 'user-001')).body[0].stale).toBe(true)
    expect((await call('POST', '/acts', 'user-001', { kind: 'send_to_client', draftId: edited.body.id })).body.code).toBe('STALE_DRAFT')
  })

  it('carries a Brief finding once', async () => {
    const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.threadId === 'th-brief')!
    const path = `/threads/th-brief/findings/${finding.id}/carry`
    expect((await call('POST', path, 'user-001', { toThreadId: 'th-johnson-review' })).status).toBe(201)
    expect((await call('POST', path, 'user-001', { toThreadId: 'th-johnson-review' })).status).toBe(200)
    expect((await call('POST', path, 'user-001', {})).status).toBe(400)
    expect((await call('POST', path, 'cli-001', { toThreadId: 'th-johnson-review' })).status).toBe(404)
  })
})
```

```tsx
// src/hooks/__tests__/use-workspace-proposals.test.tsx
import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useCreateProposal, useProposal, useProposals, useReviseProposal } from '@/hooks/use-workspace'

it('a revision from one pane refreshes every query that reads the proposal', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({
    list: useProposals('th-johnson-review'),
    one: useProposal('prop-0001'),
    create: useCreateProposal('th-johnson-review'),
    revise: useReviseProposal('prop-0001'),
  }), { wrapper })
  await waitFor(() => expect(result.current.list.data).toEqual([]))
  await act(() => result.current.create.mutateAsync('acc-002'))
  await waitFor(() => expect(result.current.list.data?.map((p) => p.id)).toEqual(['prop-0001']))
  await waitFor(() => expect(result.current.one.data?.versions).toHaveLength(1))
  await act(() => result.current.revise.mutateAsync([{ kind: 'harvest_only' }]))
  await waitFor(() => expect(result.current.one.data?.versions).toHaveLength(2))
  await waitFor(() => expect(result.current.list.data?.[0]?.versions).toHaveLength(2))
  expect(client.getQueryData(['workspace', 'user-001', 'proposal', 'prop-0001'])).toBeDefined()
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/workspace-proposals-api.test.ts src/hooks/__tests__/use-workspace-proposals.test.tsx`
Expected: FAIL — the endpoints answer 405 (the catch-all) and the hooks do not exist.

- [ ] **Step 3: Shared handler helpers**

Move `unauthorised`, `badRequest`, `readJson` and `nonEmptyString` out of `workspace.ts` into:

```ts
// src/mocks/handlers/workspace-http.ts
import { HttpResponse } from 'msw'

export const unauthorised = () => HttpResponse.json({ code: 'NO_VIEWER', message: 'A known viewer is required.' }, { status: 401 })
export const badRequest = (message: string) => HttpResponse.json({ code: 'BAD_REQUEST', message }, { status: 400 })
export const refusal = ({ status, code, message }: { status: number; code: string; message: string }) => HttpResponse.json({ code, message }, { status })

export async function readJson(request: Request): Promise<Record<string, unknown> | undefined> {
  const parsed: unknown = await request.json().catch(() => undefined)
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
}

export const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
```

`workspace.ts` imports them from `./workspace-http`.

- [ ] **Step 4: Proposal handlers**

```ts
// src/mocks/handlers/workspace-proposals.ts
import { http, HttpResponse } from 'msw'
import { viewerFrom } from '../workspace/visibility'
import { visibleProposal } from '../workspace/proposal-acts'
import { createProposal, previewEdits, readableProposals, reviseProposal, saveVersion } from '../workspace/proposals'
import { parseConstraints, parseEdits } from '../workspace/proposal-engine'
import { detailOf } from '../data/proposals-store'
import { badRequest, nonEmptyString, readJson, refusal, unauthorised } from './workspace-http'
import { notFound } from './utils'

export const workspaceProposalHandlers = [
  http.get('/api/workspace/proposals', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const threadId = new URL(request.url).searchParams.get('threadId') ?? undefined
    const list = readableProposals(viewer, threadId)
    return list ? HttpResponse.json(list) : notFound()
  }),

  http.get('/api/workspace/proposals/:id', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const proposal = visibleProposal(viewer, String(params.id))
    return proposal ? HttpResponse.json(detailOf(proposal)) : notFound()
  }),

  http.post('/api/workspace/proposals', async ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = await readJson(request)
    if (!body || !nonEmptyString(body.threadId) || !nonEmptyString(body.accountId)) return badRequest('threadId and accountId are required.')
    const r = createProposal(viewer, body.threadId, body.accountId)
    return r.ok ? HttpResponse.json(r.detail, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  http.post('/api/workspace/proposals/:id/revise', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    if (!visibleProposal(viewer, String(params.id))) return notFound()
    const parsed = parseConstraints((await readJson(request))?.constraints)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = reviseProposal(viewer, String(params.id), parsed.value)
    return r.ok ? HttpResponse.json(r.detail, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/proposals/:id/versions', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    if (!visibleProposal(viewer, String(params.id))) return notFound()
    const parsed = parseEdits((await readJson(request))?.edits)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = saveVersion(viewer, String(params.id), parsed.value)
    return r.ok ? HttpResponse.json(r.detail, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/proposals/:id/preview', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    if (!visibleProposal(viewer, String(params.id))) return notFound()
    const parsed = parseEdits((await readJson(request))?.edits)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = previewEdits(viewer, String(params.id), parsed.value)
    return r.ok ? HttpResponse.json(r.preview) : refusal(r)
  }),
]
```

Every route checks visibility before validating the body, so a client learns nothing from a `400`.

- [ ] **Step 5: Acts, drafts, letters, carry in `workspace.ts`**

Replace the `POST /api/workspace/acts` handler:

```ts
  http.post('/api/workspace/acts', async ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = await readJson(request)
    if (!body || typeof body.kind !== 'string') return badRequest('kind must be a string.')
    switch (body.kind) {
      case 'send_to_client': {
        if (!nonEmptyString(body.draftId)) return badRequest('draftId must be a string.')
        const r = sendToClient(viewer, body.draftId)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'approve_proposal': {
        if (!nonEmptyString(body.proposalId)) return badRequest('proposalId is required.')
        if (!visibleProposal(viewer, body.proposalId)) return notFound()
        if (typeof body.version !== 'number' || !nonEmptyString(body.fingerprint)) return badRequest('version (a number) and fingerprint are required.')
        const r = approveProposal(viewer, body.proposalId, body.version, body.fingerprint)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'withdraw_approval': {
        if (!nonEmptyString(body.proposalId)) return badRequest('proposalId is required.')
        const r = withdrawApproval(viewer, body.proposalId)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      default:
        return HttpResponse.json({ code: 'NOT_IN_PHASE', message: 'That act is not recorded in this phase.' }, { status: 400 })
    }
  }),
```

The `GET /api/workspace/threads/:id/drafts` handler returns `draftsFor(thread.id)`. Add, before the catch-all:

```ts
  http.post('/api/workspace/threads/:id/drafts/letter', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = await readJson(request)
    const proposalId = body && nonEmptyString(body.proposalId) ? body.proposalId : ''
    const r = draftLetter(viewer, String(params.id), proposalId)
    return r.ok ? HttpResponse.json(r.draft, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  http.post('/api/workspace/threads/:id/drafts/:draftId/revisions', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = await readJson(request)
    const text = body && typeof body.body === 'string' ? body.body : ''
    const r = reviseDraft(viewer, String(params.id), String(params.draftId), text)
    return r.ok ? HttpResponse.json(r.draft, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/threads/:id/findings/:messageId/carry', async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const body = await readJson(request)
    const toThreadId = body && nonEmptyString(body.toThreadId) ? body.toThreadId : undefined
    if (toThreadId === undefined) {
      const from = store().threads.find((t) => t.id === params.id)
      return from && canSeeThread(viewer, from) ? badRequest('toThreadId is required.') : notFound()
    }
    const r = carryFinding(viewer, String(params.id), String(params.messageId), toThreadId)
    return r.ok ? HttpResponse.json(r.message, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  ...workspaceProposalHandlers,
```

(an empty `proposalId` makes `draftLetter` answer `404`, after its thread check, so a client still sees `404`). Imports: `draftLetter`, `draftsFor`, `reviseDraft` from `../workspace/letters`; `approveProposal`, `visibleProposal`, `withdrawApproval` from `../workspace/proposal-acts`; `carryFinding` from `../workspace/carry`; `workspaceProposalHandlers` from `./workspace-proposals`. The catch-all stays last.

- [ ] **Step 6: Services and hooks**

Append to `src/services/workspace.ts`:

```ts
import type { DraftPreview, LegEdit, ProposalConstraint, ProposalDetail } from '@/types/workspace-proposal'

export const getProposals = (viewer: string, threadId?: string) =>
  get<ProposalDetail[]>('/workspace/proposals', threadId ? { threadId } : undefined, as(viewer))
export const getProposal = (viewer: string, id: string) =>
  get<ProposalDetail>(`/workspace/proposals/${id}`, undefined, as(viewer))
export const createProposal = (viewer: string, threadId: string, accountId: string) =>
  post<ProposalDetail>('/workspace/proposals', { threadId, accountId }, as(viewer))
export const reviseProposal = (viewer: string, id: string, constraints: ProposalConstraint[]) =>
  post<ProposalDetail>(`/workspace/proposals/${id}/revise`, { constraints }, as(viewer))
export const saveProposalVersion = (viewer: string, id: string, edits: LegEdit[]) =>
  post<ProposalDetail>(`/workspace/proposals/${id}/versions`, { edits }, as(viewer))
export const previewProposalEdits = (viewer: string, id: string, edits: LegEdit[]) =>
  post<DraftPreview>(`/workspace/proposals/${id}/preview`, { edits }, as(viewer))
export const approveProposal = (viewer: string, proposalId: string, version: number, fingerprint: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'approve_proposal', proposalId, version, fingerprint }, as(viewer))
export const withdrawApproval = (viewer: string, proposalId: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'withdraw_approval', proposalId }, as(viewer))
export const carryFinding = (viewer: string, fromThreadId: string, messageId: string, toThreadId: string) =>
  post<Message>(`/workspace/threads/${fromThreadId}/findings/${messageId}/carry`, { toThreadId }, as(viewer))
export const draftLetter = (viewer: string, clientThreadId: string, proposalId: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/letter`, { proposalId }, as(viewer))
export const reviseDraft = (viewer: string, clientThreadId: string, draftId: string, body: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/${draftId}/revisions`, { body }, as(viewer))
```

Append to `src/hooks/use-workspace.ts` (with `keepPreviousData` imported from `@tanstack/react-query` and the types imported):

```ts
export function useProposals(threadId?: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'proposals', threadId ?? 'all'],
    queryFn: () => api.getProposals(viewerId, threadId),
    enabled,
  })
}

export function useProposal(id: string) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'proposal', id], queryFn: () => api.getProposal(viewerId, id) })
}

/** The engine's preview of a draft version. The previous preview stays on screen while the next one loads. */
export function useProposalPreview(id: string, edits: LegEdit[], enabled: boolean) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'proposal-preview', id, JSON.stringify(edits)],
    queryFn: () => api.previewProposalEdits(viewerId, id, edits),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useCreateProposal(threadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (accountId: string) => api.createProposal(viewerId, threadId, accountId), onSettled: invalidate })
}

export function useReviseProposal(proposalId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (constraints: ProposalConstraint[]) => api.reviseProposal(viewerId, proposalId, constraints), onSettled: invalidate })
}

export function useSaveVersion(proposalId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (edits: LegEdit[]) => api.saveProposalVersion(viewerId, proposalId, edits), onSettled: invalidate })
}

export function useApproveProposal() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ proposalId, version, fingerprint }: { proposalId: string; version: number; fingerprint: string }) =>
      api.approveProposal(viewerId, proposalId, version, fingerprint),
    onSettled: invalidate,
  })
}

export function useWithdrawApproval() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (proposalId: string) => api.withdrawApproval(viewerId, proposalId), onSettled: invalidate })
}

export function useCarryFinding(fromThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ messageId, toThreadId }: { messageId: string; toThreadId: string }) => api.carryFinding(viewerId, fromThreadId, messageId, toThreadId),
    onSettled: invalidate,
  })
}

export function useDraftLetter(clientThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (proposalId: string) => api.draftLetter(viewerId, clientThreadId, proposalId), onSettled: invalidate })
}

export function useReviseDraft(clientThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ draftId, body }: { draftId: string; body: string }) => api.reviseDraft(viewerId, clientThreadId, draftId, body),
    onSettled: invalidate,
  })
}
```

`onSettled`, not `onSuccess`: a refused approval (a newer version arrived) must refresh what is on screen too.

- [ ] **Step 7: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/handlers/__tests__/ src/hooks/__tests__/`
Expected: PASS, including the Phase 2 workspace suites (`workspace-write` still sees `400` for an `approve_proposal` with no fields).

- [ ] **Step 8: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/handlers/workspace-http.ts src/mocks/handlers/workspace-proposals.ts src/mocks/handlers/workspace.ts src/services/workspace.ts src/hooks/use-workspace.ts src/mocks/handlers/__tests__/workspace-proposals-api.test.ts src/hooks/__tests__/use-workspace-proposals.test.tsx
git commit -m "feat(api): proposals, approvals, letters and carrying, served per viewer; services and hooks"
```

### Task 10: The thread — proposal embed, version lines, the Brief's summary, carried findings

**Files:**
- Create: `src/workspace/proposal/latest-version.ts`, `src/workspace/proposal/proposal-href.ts`, `src/workspace/proposal/residual-words.ts`, `src/workspace/proposal/approval-words.ts`, `src/workspace/proposal/author-name.ts`, `src/workspace/proposal/leg-status.ts`, `src/workspace/proposal/drift-rows.ts`, `src/workspace/proposal/restriction-words.ts`, `src/workspace/proposal/tax-scope.ts`, `src/workspace/proposal/ApprovalNote.tsx`, `src/workspace/proposal/TaxReadings.tsx`, `src/workspace/proposal/RestrictionList.tsx`, `src/workspace/proposal/DriftBeforeAfter.tsx`, `src/workspace/proposal/PretradeNotes.tsx`, `src/workspace/proposal/ProposalLegsTable.tsx`, `src/workspace/thread/embeds/ProposalEmbed.tsx`, `src/workspace/thread/ProposalVersionLine.tsx`, `src/workspace/thread/CarriedFindingView.tsx`, `src/workspace/thread/BriefSummaryView.tsx`, `src/workspace/thread/CarryControl.tsx`, `src/workspace/thread/finding-anchor.ts`
- Modify: `src/workspace/thread/MessageView.tsx` (new kinds; takes the thread), `src/workspace/thread/ThreadPage.tsx` (passes the thread), `src/workspace/thread/AgentFindingView.tsx` (anchor id and a footer slot; accepts a carried finding), `src/app/pages/kit/KitSections.tsx` (import `taxScope` from its new home)
- Test: `src/workspace/__tests__/proposal-words.test.ts`, `src/workspace/__tests__/proposal-thread.test.tsx`, `src/workspace/__tests__/brief-thread.test.tsx`

**Interfaces:**
- Consumes: Task 9 hooks (`useProposal`, `useThreads`, `useCarryFinding`), `useDrift`, the kit.
- Produces (later UI tasks import these):

```ts
// src/workspace/proposal/latest-version.ts
export function latestVersionOf(proposal: Pick<Proposal, 'id' | 'versions'>): ProposalVersion   // throws on a proposal with no versions
// src/workspace/proposal/proposal-href.ts
export const proposalWorkbenchHref: (proposalId: string, fromThreadId?: string) => string   // /proposals/prop-0001?from=th-johnson-review
// src/workspace/proposal/residual-words.ts
export const RESIDUAL_WORDS: Readonly<Record<ResidualDriftReason, string>>
// src/workspace/proposal/approval-words.ts
export function approvalWords(state: ApprovalState): string
export function isApprovedLatest(state: ApprovalState): boolean
// src/workspace/proposal/author-name.ts
export function authorName(author: VersionAuthor, directory: Directory): string
// src/workspace/proposal/leg-status.ts
export const SIDE_WORDS: Readonly<Record<'buy' | 'sell', string>>
export function legStatus(pretrade: PreTradeCheckProposalResult, index: number, symbol: string): Status
// src/workspace/proposal/drift-rows.ts
export type DriftRow = { assetClass: AssetClass; before: number; after: number; reason?: ResidualDriftReason }
export function driftRows(before: DriftStatus, after: ProjectedDrift): DriftRow[]
// src/workspace/proposal/restriction-words.ts
export function restrictionSource(r: RepurchaseRestriction): string
// src/workspace/proposal/tax-scope.ts
export function taxScope(preview: RebalancePreview): string     // moved from KitSections, unchanged
// components
ApprovalNote({ state }), TaxReadings({ summary, currency }), RestrictionList({ restrictions }),
DriftBeforeAfter({ accountId, projected }), PretradeNotes({ pretrade }), ProposalLegsTable({ version, caption }),
ProposalEmbed({ proposalId, threadId, actions? }), ProposalVersionLine({ message, directory }),
CarriedFindingView({ message, directory }), BriefSummaryView({ summary, directory }), CarryControl({ thread, findingId })
// src/workspace/thread/finding-anchor.ts
export const findingAnchorId: (messageId: string) => string     // finding-msg-b02
```

- [ ] **Step 1: Write the failing tests**

```ts
// src/workspace/__tests__/proposal-words.test.ts
import { describe, it, expect } from 'vitest'
import { approvalWords, isApprovedLatest } from '@/workspace/proposal/approval-words'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import { driftRows } from '@/workspace/proposal/drift-rows'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { restrictionSource } from '@/workspace/proposal/restriction-words'
import type { DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'

describe('proposal wording', () => {
  it('states which version an approval applies to', () => {
    expect(approvalWords({ kind: 'unapproved', latestVersion: 2 })).toBe('v2 is not approved')
    expect(approvalWords({ kind: 'approved', version: 3, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001' })).toBe('v3 is approved')
    expect(approvalWords({ kind: 'approved', version: 2, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001' })).toBe('Approval applies to v2; v3 is unapproved')
    expect(isApprovedLatest({ kind: 'approved', version: 2, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001' })).toBe(false)
  })
  it('names every residual reason, with the ruled wording for the cash cap', () => {
    expect(RESIDUAL_WORDS.cash_capped).toBe("held to the model's cash target")
    for (const words of Object.values(RESIDUAL_WORDS)) {
      expect(words).not.toMatch(/cleared|would exceed|\d/i)
      expect(words.length).toBeLessThanOrEqual(36)
    }
  })
  it('links to the workbench, remembering the thread', () => {
    expect(proposalWorkbenchHref('prop-0001', 'th-johnson-review')).toBe('/proposals/prop-0001?from=th-johnson-review')
    expect(proposalWorkbenchHref('prop-0001')).toBe('/proposals/prop-0001')
  })
  it('keeps recorded and projected restrictions apart, with their sources', () => {
    expect(restrictionSource({ symbol: 'INTC', start: '2026-01-21', until: '2026-03-22', source: { kind: 'recorded', saleId: 'rs-001', accountId: 'acc-002', saleDate: '2026-02-20' } }))
      .toBe('recorded · sale rs-001 of 2026-02-20 in acc-002')
    expect(restrictionSource({ symbol: 'INTC', start: '2026-01-26', until: '2026-03-27', source: { kind: 'projected', accountId: 'acc-002', saleDate: '2026-02-25' } }))
      .toBe("projected · this proposal's sale in acc-002")
  })
  it('lists the classes that were out or still carry a reason, before beside after', () => {
    const before = { assetClassDrifts: [
      { assetClass: 'us_equity', target: 0.55, actual: 0.682, drift: 0.132 },
      { assetClass: 'commodities', target: 0.02, actual: 0.0199, drift: -0.0001 },
      { assetClass: 'private_equity', target: 0, actual: 0.0268, drift: 0.0268 },
    ] } as Pick<DriftStatus, 'assetClassDrifts'> as DriftStatus
    const after: ProjectedDrift = { driftTolerance: 0.05, driftThreshold: 0.005, totalDrift: 0, maxAbsDrift: 0.0268, withinBand: true, assetClassDrifts: [
      { assetClass: 'us_equity', target: 0.55, actual: 0.5501, drift: 0.0001 },
      { assetClass: 'commodities', target: 0.02, actual: 0.0199, drift: -0.0001 },
      { assetClass: 'private_equity', target: 0, actual: 0.0268, drift: 0.0268, residualReason: 'not_market_tradable' },
    ] }
    expect(driftRows(before, after)).toEqual([
      { assetClass: 'us_equity', before: 0.132, after: 0.0001 },
      { assetClass: 'private_equity', before: 0.0268, after: 0.0268, reason: 'not_market_tradable' },
    ])
  })
})
```

`before` is built with `as` from a literal because `DriftStatus` has fields the row builder never reads; if `DriftStatus`'s `assetClassDrifts` element type requires more fields, add them to the literal instead of casting further.

```tsx
// src/workspace/__tests__/proposal-thread.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, reviseProposal } from '@/services/workspace'

const ADRIAN = 'user-001'

async function openJohnson() {
  renderRoutes(routes, '/t/th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
}

describe('the proposal in the team thread', () => {
  it('shows v1 as an embed: legs with pre-trade, tax readings, restrictions, drift before and after, and the workbench link', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const embed = await openJohnson()
    const legs = await within(embed).findByRole('table', { name: 'Proposal legs · v1' })
    expect(within(legs).getAllByRole('row')).toHaveLength(10)
    expect(within(legs).getByRole('row', { name: /^SPY/ })).toHaveTextContent('WARN')
    expect(within(embed).getByText('Est. tax added to the return')).toBeInTheDocument()
    expect(embed).toHaveTextContent('10,422')
    expect(embed).toHaveTextContent('no repurchase through 2026-03-27')
    expect(embed).toHaveTextContent('recorded · sale rs-001 of 2026-02-20 in acc-002')
    const drift = await within(embed).findByRole('table', { name: 'Drift before and after' })
    expect(drift).toHaveTextContent('Private Equity')
    expect(drift).toHaveTextContent('no market to sell into')
    expect(within(embed).getByRole('link', { name: 'Workbench' })).toHaveAttribute('href', '/proposals/prop-0001?from=th-johnson-review')
    expect(embed).toHaveTextContent('v1 is not approved')
    expect(embed).toHaveTextContent('Drafted a tax-aware rebalance toward the Growth model.')
  })

  it('a revision posts a version line and the embed moves to the latest version', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await reviseProposal(ADRIAN, 'prop-0001', [{ kind: 'harvest_only' }])
    const embed = await openJohnson()
    expect(await within(embed).findByRole('table', { name: 'Proposal legs · v2' })).toBeInTheDocument()
    const line = screen.getByRole('article', { name: 'v2 · Proposal Agent' })
    expect(line).toHaveTextContent('Revised to sell only lots at a loss.')
    expect(within(line).getByRole('link', { name: 'Open in the workbench' })).toHaveAttribute('href', '/proposals/prop-0001?from=th-johnson-review')
  })

  it('says the approval stays on the older version when a newer one arrives', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint)
    await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    const embed = await openJohnson()
    expect(await within(embed).findByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
  })
})
```

```tsx
// src/workspace/__tests__/brief-thread.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { carryFinding } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const INTC_CLAIM = 'Intel Corp. can be sold at a loss today, and none of the loss would be washed.'

describe('the Brief', () => {
  it('opens ready with its ranked summary; a finding goes to the team thread once', async () => {
    renderRoutes(routes, '/t/th-brief')
    await screen.findByRole('heading', { level: 1, name: 'Brief' })
    const summary = await screen.findByRole('region', { name: 'Ranked summary' })
    const items = within(summary).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('US Equity is outside its tolerance band.')
    expect(items[1]).toHaveTextContent(INTC_CLAIM)
    const user = userEvent.setup()
    await user.click(within(items[1]!).getByRole('button', { name: INTC_CLAIM }))
    const intc = screen.getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    await waitFor(() => expect(document.activeElement).toBe(intc))
    expect(intc).toHaveTextContent('7,000')
    await user.click(within(intc).getByRole('button', { name: 'Take to team thread' }))
    expect(await within(intc).findByRole('status')).toHaveTextContent('Taken to Johnson Rebalance Review.')
    await user.click(within(intc).getByRole('button', { name: 'Take to team thread' }))
    await waitFor(() => expect(within(intc).getByRole('button', { name: 'Take to team thread' })).toBeEnabled())
    expect(store().messages.filter((m) => m.kind === 'carried')).toHaveLength(1)
  })

  it('the team thread shows the carried finding as a quoted card with who carried it', async () => {
    const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.agentId === 'harvest-scanner')!
    await carryFinding('user-001', 'th-brief', finding.id, 'th-johnson-review')
    renderRoutes(routes, '/t/th-johnson-review')
    const card = await screen.findByRole('article', { name: `Carried from the Brief: ${INTC_CLAIM}` })
    expect(card).toHaveTextContent('From the Brief · carried by Adrian Hale')
    expect(within(card).getByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Take to team thread' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/proposal-words.test.ts src/workspace/__tests__/proposal-thread.test.tsx src/workspace/__tests__/brief-thread.test.tsx`
Expected: FAIL — modules not found; the thread renders nothing for the new kinds.

- [ ] **Step 3: Wording and pure helpers**

```ts
// src/workspace/proposal/latest-version.ts
import type { Proposal, ProposalVersion } from '@/types/workspace-proposal'

/**
 * The version a proposal shows. Components call this before any early return, so a hook never
 * follows a conditional throw; a proposal without versions is an engine error, reported, never a blank.
 */
export function latestVersionOf(proposal: Pick<Proposal, 'id' | 'versions'>): ProposalVersion {
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${proposal.id} has no versions`)
  return latest
}
```

```ts
// src/workspace/proposal/proposal-href.ts
/** The workbench for a proposal, remembering the thread it was opened from. */
export const proposalWorkbenchHref = (proposalId: string, fromThreadId?: string) =>
  `/proposals/${encodeURIComponent(proposalId)}${fromThreadId ? `?from=${encodeURIComponent(fromThreadId)}` : ''}`
```

```ts
// src/workspace/proposal/residual-words.ts
import type { ResidualDriftReason } from '@/services/oms'

/** Why an asset class remains away from target after the trades, in a phrase that fits a table cell. */
export const RESIDUAL_WORDS: Readonly<Record<ResidualDriftReason, string>> = {
  not_market_tradable: 'no market to sell into',
  cash_capped: "held to the model's cash target",
  replacement_hold: 'harvest replacement, held for now',
  below_lot_size: 'less than one share away',
  excluded_by_constraint: 'excluded from this proposal',
  harvest_only: 'harvest only: holdings at a gain',
  gains_capped: 'realised gains capped',
  wash_sale_avoided: 'buying it would wash a loss',
}
```

```ts
// src/workspace/proposal/approval-words.ts
import type { ApprovalState } from '@/types/workspace-proposal'

export const isApprovedLatest = (state: ApprovalState) => state.kind === 'approved' && state.version === state.latestVersion

/** Approval belongs to one exact version; a newer version is said to be unapproved. */
export function approvalWords(state: ApprovalState): string {
  if (state.kind === 'unapproved') return `v${state.latestVersion} is not approved`
  return isApprovedLatest(state) ? `v${state.version} is approved` : `Approval applies to v${state.version}; v${state.latestVersion} is unapproved`
}
```

```ts
// src/workspace/proposal/author-name.ts
import type { Directory, VersionAuthor } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

export function authorName(author: VersionAuthor, directory: Directory): string {
  if (author.kind === 'person') return personIn(directory, author.personId).name
  const agent = directory.agents.find((a) => a.id === author.agentId)
  if (!agent) throw new Error(`No agent "${author.agentId}" in the directory`)
  return agent.name
}
```

```ts
// src/workspace/proposal/leg-status.ts
import type { Status } from '@/kit/status/status'
import type { PreTradeCheckProposalResult, ProposalLegResult } from '@/services/oms'

const SEVERITY_STATUS: Readonly<Record<ProposalLegResult['severity'], Status>> = { block: 'BLOCK', warning: 'WARN', pass: 'CLEAR' }
export const SIDE_WORDS: Readonly<Record<'buy' | 'sell', string>> = { buy: 'Buy', sell: 'Sell' }

/** The pre-trade verdict on one leg, as the engine attributed it. A leg the check did not read is an error, never a pass. */
export function legStatus(pretrade: PreTradeCheckProposalResult, index: number, symbol: string): Status {
  const result = pretrade.legs.find((l) => l.index === index)
  if (!result || result.symbol !== symbol) throw new Error(`The pre-trade check has no result for the ${symbol} leg`)
  return SEVERITY_STATUS[result.severity]
}
```

```ts
// src/workspace/proposal/drift-rows.ts
import type { AssetClass, DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift, ResidualDriftReason } from '@/services/oms'

export type DriftRow = { assetClass: AssetClass; before: number; after: number; reason?: ResidualDriftReason }

/** Classes that were away from target before the trades, or still carry a reason after: before beside after, both from the engine. */
export function driftRows(before: DriftStatus, after: ProjectedDrift): DriftRow[] {
  return after.assetClassDrifts.flatMap((a) => {
    const b = before.assetClassDrifts.find((d) => d.assetClass === a.assetClass)
    const was = b?.drift ?? 0
    if (Math.abs(was) <= after.driftThreshold && a.residualReason === undefined) return []
    return [{ assetClass: a.assetClass, before: was, after: a.drift, ...(a.residualReason ? { reason: a.residualReason } : {}) }]
  })
}
```

```ts
// src/workspace/proposal/restriction-words.ts
import { fmtDate } from '@/kit/measure'
import type { RepurchaseRestriction } from '@/services/oms'

export function restrictionSource({ source }: RepurchaseRestriction): string {
  return source.kind === 'recorded'
    ? `recorded · sale ${source.saleId} of ${fmtDate(source.saleDate)} in ${source.accountId}`
    : `projected · this proposal's sale in ${source.accountId}`
}
```

Move `taxScope` (and its imports of `fmtResult`, `CAPITAL_LOSS_SCOPE_NOTE`, `RebalancePreview`) from `KitSections.tsx` into `src/workspace/proposal/tax-scope.ts` as an exported function, unchanged; `KitSections.tsx` imports it.

- [ ] **Step 4: The embed's parts**

```tsx
// src/workspace/proposal/ApprovalNote.tsx
import { Tag } from '@/kit/tag/Tag'
import type { ApprovalState } from '@/types/workspace-proposal'
import { approvalWords, isApprovedLatest } from './approval-words'

export function ApprovalNote({ state }: { state: ApprovalState }) {
  const tag = isApprovedLatest(state) ? 'APPROVED' : state.kind === 'approved' ? 'NEWER VERSION UNAPPROVED' : 'NOT APPROVED'
  return (
    <p className="flex flex-wrap items-baseline gap-2 text-body">
      <Tag tone={isApprovedLatest(state) ? 'solid' : 'outline'}>{tag}</Tag>
      <span>{approvalWords(state)}</span>
    </p>
  )
}
```

```tsx
// src/workspace/proposal/TaxReadings.tsx
import { Reading } from '@/kit/reading/Reading'
import { fmtMoney, fmtResult } from '@/kit/measure'
import { taxEstimateDirection } from '@/lib/capital-gains'
import type { ProposalTaxSummary } from '@/types/workspace-proposal'

export function TaxReadings({ summary, currency }: { summary: ProposalTaxSummary; currency: string }) {
  const estimate = taxEstimateDirection(summary.netTax)
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-3">
      <Reading label="Sold" value={fmtMoney(summary.sold)} unit={currency} />
      <Reading label="Bought" value={fmtMoney(summary.bought)} unit={currency} />
      <Reading label="Gains realised" value={fmtResult(summary.gains)} unit={currency} />
      <Reading label="Losses realised" value={fmtResult(summary.losses)} unit={currency} />
      {summary.washed !== 0 ? <Reading label="Washed" value={fmtResult(summary.washed)} unit={currency} /> : null}
      <Reading label={`Est. tax ${estimate.direction} the return`} value={fmtMoney(estimate.amount)} unit={currency} />
    </div>
  )
}
```

```tsx
// src/workspace/proposal/RestrictionList.tsx
import { useId } from 'react'
import { fmtDate } from '@/kit/measure'
import type { RepurchaseRestriction } from '@/services/oms'
import { restrictionSource } from './restriction-words'

export function RestrictionList({ restrictions }: { restrictions: RepurchaseRestriction[] }) {
  const titleId = useId()
  if (restrictions.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-1.5">
      <h3 id={titleId} className="text-label uppercase text-ink-2">Repurchase restrictions · wash-sale taxpayer</h3>
      <ul className="flex flex-col gap-1 text-body">
        {restrictions.map((r) => (
          <li key={`${r.symbol}:${r.source.kind}:${r.until}`} className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{r.symbol}</span>
            <span className="tabular">{`no repurchase through ${fmtDate(r.until)}`}</span>
            <span className="text-ink-3">{restrictionSource(r)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

```tsx
// src/workspace/proposal/DriftBeforeAfter.tsx
import { DataTable } from '@/kit/data-table/DataTable'
import { StatusCode } from '@/kit/status/StatusCode'
import { driftStatus } from '@/kit/gauge/gauge-math'
import { fmtDrift } from '@/kit/measure'
import { useDrift } from '@/hooks/use-portfolio'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { ProjectedDrift } from '@/services/oms'
import { driftRows } from './drift-rows'
import { RESIDUAL_WORDS } from './residual-words'

export function DriftBeforeAfter({ accountId, projected }: { accountId: string; projected: ProjectedDrift }) {
  const drift = useDrift(accountId)
  if (drift.isPending) return <p role="status" className="text-body text-ink-3">Loading the drift reading…</p>
  if (drift.isError) return <p role="alert" className="text-body">{drift.error.message}</p>
  return (
    <DataTable caption="Drift before and after" rows={driftRows(drift.data, projected)} getRowId={(r) => r.assetClass}
      noun={{ singular: 'asset class', plural: 'asset classes' }} density="dense"
      columns={[
        { id: 'class', header: 'Asset class', cell: (r) => assetClassLabel(r.assetClass) },
        { id: 'before', header: 'Before', unit: 'pp', align: 'right', cell: (r) => fmtDrift(r.before) },
        { id: 'after', header: 'After', unit: 'pp', align: 'right', cell: (r) => fmtDrift(r.after) },
        { id: 'band', header: 'Band', cell: (r) => <StatusCode status={driftStatus(r.after, projected.driftTolerance)} /> },
        { id: 'reason', header: 'Why it remains', cell: (r) => (r.reason ? RESIDUAL_WORDS[r.reason] : '') },
      ]} />
  )
}
```

```tsx
// src/workspace/proposal/PretradeNotes.tsx
import { StatusCode } from '@/kit/status/StatusCode'
import type { PreTradeCheckProposalResult } from '@/services/oms'

/** The proposal-level pre-trade check, in the engine's own words. */
export function PretradeNotes({ pretrade }: { pretrade: PreTradeCheckProposalResult }) {
  if (pretrade.violations.length === 0) return <p className="text-body text-ink-2">No pre-trade check flagged this version.</p>
  return (
    <ul aria-label="Pre-trade check" className="flex flex-col gap-1.5">
      {pretrade.violations.map((v) => (
        <li key={`${v.category}:${v.symbol ?? v.constraint}`} className="flex items-baseline gap-3 text-body">
          <StatusCode status={v.severity === 'block' ? 'BLOCK' : 'WARN'} />
          <span>{v.message}</span>
        </li>
      ))}
    </ul>
  )
}
```

```tsx
// src/workspace/proposal/ProposalLegsTable.tsx
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import type { Status } from '@/kit/status/status'
import { fmtMoney, fmtQuantity, fmtResult } from '@/kit/measure'
import type { ProposedTrade } from '@/services/oms'
import type { DraftPreview } from '@/types/workspace-proposal'
import { SIDE_WORDS, legStatus } from './leg-status'

type Row = ProposedTrade & { status: Status }

/** The compact legs table of the thread embed: realised results by character, pre-trade per leg. */
export function ProposalLegsTable({ version, caption }: { version: DraftPreview; caption: string }) {
  const currency = version.preview.currency
  const rows: Row[] = version.preview.trades.map((t, i) => ({ ...t, status: legStatus(version.pretrade, i, t.symbol) }))
  return (
    <DataTable caption={caption} rows={rows} getRowId={(r) => r.symbol} noun={{ singular: 'leg', plural: 'legs' }} density="dense"
      columns={[
        { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol },
        { id: 'side', header: 'Side', cell: (r) => SIDE_WORDS[r.side] },
        { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (r) => <Num text={fmtQuantity(r.quantity)} /> },
        { id: 'value', header: 'Value', unit: currency, align: 'right', cell: (r) => fmtMoney(r.estimatedValue) },
        { id: 'st', header: 'ST', unit: currency, align: 'right', cell: (r) => fmtResult(r.realisedShortTerm) },
        { id: 'lt', header: 'LT', unit: currency, align: 'right', cell: (r) => fmtResult(r.realisedLongTerm) },
        { id: 'check', header: 'Pre-trade', cell: (r) => <StatusCode status={r.status} /> },
      ]} />
  )
}
```

`ST` and `LT` are the realised short-term and long-term results; the table's caption is read first by assistive technology and the workbench (Task 13) spells them out.

- [ ] **Step 5: The embed, the version line, the summary, carried findings**

```tsx
// src/workspace/thread/embeds/ProposalEmbed.tsx
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDirectory, useProposal } from '@/hooks/use-workspace'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { DriftBeforeAfter } from '@/workspace/proposal/DriftBeforeAfter'
import { PretradeNotes } from '@/workspace/proposal/PretradeNotes'
import { ProposalLegsTable } from '@/workspace/proposal/ProposalLegsTable'
import { RestrictionList } from '@/workspace/proposal/RestrictionList'
import { TaxReadings } from '@/workspace/proposal/TaxReadings'
import { authorName } from '@/workspace/proposal/author-name'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'

type ProposalEmbedProps = { proposalId: string; threadId: string; actions?: ReactNode }

/** The proposal as the thread shows it: always its latest version. */
export function ProposalEmbed({ proposalId, threadId, actions }: ProposalEmbedProps) {
  const titleId = useId()
  const proposal = useProposal(proposalId)
  const directory = useDirectory()
  if (proposal.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  if (proposal.isError) return <p role="alert" className="text-body">{proposal.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const p = proposal.data
  const latest = latestVersionOf(p)
  const currency = latest.preview.currency
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Proposal · ${p.title}`}</h2>
        <span className="tabular text-label text-ink-3">{`v${latest.n} · ${authorName(latest.author, directory.data)}`}</span>
      </div>
      <p className="text-copy">{latest.changeSummary}</p>
      <ApprovalNote state={p.approval} />
      <ProposalLegsTable version={latest} caption={`Proposal legs · v${latest.n}`} />
      <TaxReadings summary={latest.summary} currency={currency} />
      <RestrictionList restrictions={latest.preview.repurchaseRestrictions} />
      <DriftBeforeAfter accountId={p.accountId} projected={latest.preview.projectedDrift} />
      <PretradeNotes pretrade={latest.pretrade} />
      <div className="flex flex-wrap items-center gap-4">
        <Link to={proposalWorkbenchHref(p.id, threadId)} className="text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
          Workbench <span aria-hidden="true">↗</span>
        </Link>
        {actions}
      </div>
    </section>
  )
}
```

```tsx
// src/workspace/thread/ProposalVersionLine.tsx
import { Link } from 'react-router-dom'
import { fmtTimestamp } from '@/kit/measure'
import { authorName } from '@/workspace/proposal/author-name'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import type { Directory, Message } from '@/types/workspace'

type VersionMessage = Extract<Message, { kind: 'proposal_version' }>

export function ProposalVersionLine({ message, directory }: { message: VersionMessage; directory: Directory }) {
  const name = authorName(message.author, directory)
  return (
    <article aria-label={`v${message.version} · ${name}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular text-body font-semibold">{`v${message.version}`}</span>
        <span className="text-body">{name}</span>
        <span className="text-label uppercase text-ink-3">{message.author.kind === 'agent' ? 'Agent' : 'Workbench'}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">{message.changeSummary}</p>
      <Link to={proposalWorkbenchHref(message.proposalId, message.threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open in the workbench <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
```

```ts
// src/workspace/thread/finding-anchor.ts
/** Where a finding sits in the thread, so the Brief's summary can move focus to it. */
export const findingAnchorId = (messageId: string) => `finding-${messageId}`
```

```tsx
// src/workspace/thread/BriefSummaryView.tsx
import { useId } from 'react'
import { Button } from '@/kit/button/Button'
import { StatusCode } from '@/kit/status/StatusCode'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import type { Directory, Message } from '@/types/workspace'
import { findingAnchorId } from './finding-anchor'

type Summary = Extract<Message, { kind: 'brief_summary' }>

export function BriefSummaryView({ summary, directory }: { summary: Summary; directory: Directory }) {
  const titleId = useId()
  const focusAfter = useFocusAfter()
  const agentName = (id: string) => directory.agents.find((a) => a.id === id)?.name ?? id
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 border border-ink p-4">
      <h2 id={titleId} className="text-label uppercase text-ink-2">Ranked summary</h2>
      <ol className="flex flex-col gap-2">
        {summary.items.map((item) => (
          <li key={item.findingId} className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-3">
            <span>{item.attention === 'attention' ? <StatusCode status="OUT" /> : null}</span>
            <Button rank="quiet" className="text-left font-normal" onClick={() => focusAfter(findingAnchorId(item.findingId))}>{item.claim}</Button>
            <span className="text-label uppercase text-ink-3">{agentName(item.agentId)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

```tsx
// src/workspace/thread/CarryControl.tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useCarryFinding, useThreads } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Thread } from '@/types/workspace'

/** "Take to team thread": the brief's owner sends a finding to the team thread about the same subject. */
export function CarryControl({ thread, findingId }: { thread: Thread; findingId: string }) {
  const { viewerId } = useViewer()
  const threads = useThreads()
  const carry = useCarryFinding(thread.id)
  const [taken, setTaken] = useState<string>()
  const target = (threads.data ?? []).find((t) => t.visibility === 'internal' && t.memberIds.includes(viewerId)
    && t.subject?.type === thread.subject?.type && t.subject?.id === thread.subject?.id)
  if (thread.ownerId !== viewerId || !target) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button rank="secondary" disabled={carry.isPending}
        onClick={() => carry.mutate({ messageId: findingId, toThreadId: target.id }, { onSuccess: () => setTaken(target.title) })}>
        Take to team thread
      </Button>
      {taken ? <p role="status" className="text-body text-ink-2">{`Taken to ${taken}.`}</p> : null}
      {carry.isError ? <p role="alert" className="text-body">{carry.error.message}</p> : null}
    </div>
  )
}
```

```tsx
// src/workspace/thread/CarriedFindingView.tsx
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import type { Directory, Message } from '@/types/workspace'
import { AgentFindingView } from './AgentFindingView'

type Carried = Extract<Message, { kind: 'carried' }>

export function CarriedFindingView({ message, directory }: { message: Carried; directory: Directory }) {
  const agent = directory.agents.find((a) => a.id === message.finding.agentId)
  if (!agent) throw new Error(`No agent "${message.finding.agentId}" in the directory`)
  return (
    <article aria-label={`Carried from the Brief: ${message.finding.claim}`} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label uppercase text-ink-3">{`From the Brief · carried by ${personIn(directory, message.carriedBy).name}`}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <blockquote className="border-l-2 border-rule-2 pl-4">
        <AgentFindingView finding={message.finding} agent={agent} />
      </blockquote>
    </article>
  )
}
```

`AgentFindingView` changes: its `finding` prop type becomes `Pick<Extract<Message, { kind: 'agent_finding' }>, 'at' | 'claim' | 'figures' | 'citations' | 'attention'>` (a `CarriedFinding` fits), and it takes `anchorId?: string` (set as the article's `id`, with `tabIndex={-1}` when present) and `footer?: ReactNode` (rendered after the source chips).

`MessageView` takes a `thread: Thread` prop (which `ThreadPage` passes) and adds these cases:

```tsx
    case 'agent_finding': {
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      const footer = thread.visibility === 'private' ? <CarryControl thread={thread} findingId={message.id} /> : undefined
      return <AgentFindingView finding={message} agent={agent} anchorId={findingAnchorId(message.id)} footer={footer} />
    }
    case 'proposal': {
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      return <ByAgent name={agent.name} at={message.at}><ProposalEmbed proposalId={message.proposalId} threadId={message.threadId} /></ByAgent>
    }
    case 'proposal_version':
      return <ProposalVersionLine message={message} directory={directory} />
    case 'carried':
      return <CarriedFindingView message={message} directory={directory} />
    case 'brief_summary':
      return <BriefSummaryView summary={message} directory={directory} />
```

with, in the same file:

```tsx
function ByAgent({ name, at, children }: { name: string; at: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{name}</span>
        <span className="text-label uppercase text-ink-3">Agent</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(at)}</span>
      </div>
      {children}
    </div>
  )
}
```

`ThreadPage`'s `<MessageView message={m} directory={directory} />` becomes `<MessageView message={m} thread={thread} directory={directory} />`.

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/ src/__tests__/guardrails/`
Expected: PASS. The guardrails confirm no raw element, colour literal or formatter bypass crept in.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/workspace/proposal src/workspace/thread src/app/pages/kit/KitSections.tsx src/workspace/__tests__/proposal-words.test.ts src/workspace/__tests__/proposal-thread.test.tsx src/workspace/__tests__/brief-thread.test.tsx
git commit -m "feat(workspace): proposal embed and version lines; the Brief's ranked summary; carried findings"
```

### Task 11: Revise in the thread, "Ask Proposal Agent", and two kit inputs

**Files:**
- Create: `src/kit/checkbox/Checkbox.tsx`, `src/kit/number-input/NumberInput.tsx`, `src/workspace/proposal/constraint-form.ts`, `src/workspace/proposal/ReviseDialog.tsx`, `src/workspace/context/ProposalAgentControl.tsx`, `src/workspace/thread/can-post.ts`
- Modify: `src/workspace/context/AskAgents.tsx`, `src/workspace/context/ContextColumn.tsx` (passes `canPost`), `src/workspace/thread/MessageView.tsx` (Revise action on the embed), `src/app/pages/kit/KitSections.tsx` (gallery entries for the two inputs)
- Test: `src/kit/__tests__/Checkbox.test.tsx`, `src/kit/__tests__/NumberInput.test.tsx`, `src/workspace/__tests__/constraint-form.test.ts`, `src/workspace/__tests__/revise.test.tsx`

**Interfaces:**
- Consumes: Task 9 `useCreateProposal`, `useProposals`, `useReviseProposal`, `useProposal`; Task 10 `ProposalEmbed` (`actions` slot); `composerModeOf` (`src/workspace/thread/composer-mode.ts`).
- Produces:

```ts
// kit
Checkbox({ label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; describedBy?: string })
NumberInput({ label: string; value: string; onChange: (value: string) => void; unit?: string; error?: string; disabled?: boolean; onCommit?: () => void })
// src/workspace/proposal/constraint-form.ts
export type ConstraintForm = { harvestOnly: boolean; capOn: boolean; cap: string; exclude: string }
export function formFromConstraints(constraints: readonly ProposalConstraint[]): ConstraintForm
export function constraintsFromForm(form: ConstraintForm): { ok: true; constraints: ProposalConstraint[] } | { ok: false; message: string }
// src/workspace/thread/can-post.ts
export function canPostIn(thread: Thread, viewerId: string, directory: Directory): boolean   // composerModeOf(...).kind === 'post' on a firm thread
```

- [ ] **Step 1: Write the failing tests**

```tsx
// src/kit/__tests__/Checkbox.test.tsx
import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/kit/checkbox/Checkbox'

it('is a labelled checkbox that reports its new state', async () => {
  const onChange = vi.fn()
  render(<Checkbox label="Harvest only" checked={false} onChange={onChange} />)
  await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Harvest only' }))
  expect(onChange).toHaveBeenCalledWith(true)
})
```

```tsx
// src/kit/__tests__/NumberInput.test.tsx
import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberInput } from '@/kit/number-input/NumberInput'

it('is labelled with its unit, reports text, commits on Enter, and announces an error', async () => {
  const onChange = vi.fn()
  const onCommit = vi.fn()
  const { rerender } = render(<NumberInput label="Quantity" unit="sh" value="" onChange={onChange} onCommit={onCommit} />)
  const input = screen.getByRole('textbox', { name: 'Quantity sh' })
  expect(input).toHaveAttribute('inputmode', 'decimal')
  await userEvent.setup().type(input, '7{Enter}')
  expect(onChange).toHaveBeenCalledWith('7')
  expect(onCommit).toHaveBeenCalled()
  rerender(<NumberInput label="Quantity" unit="sh" value="0" onChange={onChange} error="The quantity must be positive." />)
  expect(screen.getByRole('textbox', { name: 'Quantity sh' })).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByRole('textbox', { name: 'Quantity sh' })).toHaveAccessibleDescription('The quantity must be positive.')
})
```

```ts
// src/workspace/__tests__/constraint-form.test.ts
import { describe, it, expect } from 'vitest'
import { constraintsFromForm, formFromConstraints } from '@/workspace/proposal/constraint-form'

describe('the revise form', () => {
  it('reads a version\'s constraints back into the form', () => {
    expect(formFromConstraints([{ kind: 'avoid_self_wash' }, { kind: 'cap_realised_gains', usd: 50_000 }, { kind: 'exclude_asset_class', assetClass: 'digital_assets' }]))
      .toEqual({ harvestOnly: false, capOn: true, cap: '50000', exclude: 'digital_assets' })
  })
  it('turns the form into constraints, accepting dollar signs and commas', () => {
    expect(constraintsFromForm({ harvestOnly: true, capOn: true, cap: '$50,000', exclude: '' }))
      .toEqual({ ok: true, constraints: [{ kind: 'harvest_only' }, { kind: 'cap_realised_gains', usd: 50_000 }] })
  })
  it.each(['', 'abc', '-5', '1e999'])('refuses a cap of %j', (cap) => {
    expect(constraintsFromForm({ harvestOnly: false, capOn: true, cap, exclude: '' }).ok).toBe(false)
  })
  it('refuses an unknown asset class', () => {
    expect(constraintsFromForm({ harvestOnly: false, capOn: false, cap: '', exclude: 'gold' }).ok).toBe(false)
  })
})
```

```tsx
// src/workspace/__tests__/revise.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'

const contextColumn = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function openJohnson() {
  renderRoutes(routes, '/t/th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return contextColumn().findByRole('region', { name: 'Ask an agent' })
}

describe('asking and revising', () => {
  it('"Ask Proposal Agent" posts v1 once, even when clicked twice', async () => {
    const ask = await openJohnson()
    const user = userEvent.setup()
    await user.dblClick(within(ask).getByRole('button', { name: 'Ask Proposal Agent' }))
    expect(await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })).toBeInTheDocument()
    expect(within(ask).getByRole('status')).toHaveTextContent(/Proposal Agent (posted v1 in the thread|has already drafted this proposal)/)
    expect(store().proposals).toHaveLength(1)
    expect(store().messages.filter((m) => m.kind === 'proposal')).toHaveLength(1)
  })

  it('Revise offers the constraints; the agent posts v2 with a change summary', async () => {
    const ask = await openJohnson()
    const user = userEvent.setup()
    await user.click(within(ask).getByRole('button', { name: 'Ask Proposal Agent' }))
    const embed = await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
    await user.click(within(embed).getByRole('button', { name: 'Revise' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revise the proposal' })
    await user.click(within(dialog).getByRole('checkbox', { name: 'Cap realised gains' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Realised gains cap USD' }), '50,000')
    await user.click(within(dialog).getByRole('button', { name: 'Ask Proposal Agent to revise' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const line = await screen.findByRole('article', { name: 'v2 · Proposal Agent' })
    expect(line).toHaveTextContent('Revised to cap the gains it realises.')
    expect(await within(embed).findByRole('table', { name: 'Proposal legs · v2' })).toBeInTheDocument()
  })

  it('shows the engine refusing an unchanged revision inside the dialog', async () => {
    const ask = await openJohnson()
    const user = userEvent.setup()
    await user.click(within(ask).getByRole('button', { name: 'Ask Proposal Agent' }))
    const embed = await screen.findByRole('region', { name: 'Proposal · Johnson rebalance' })
    await user.click(within(embed).getByRole('button', { name: 'Revise' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revise the proposal' })
    await user.click(within(dialog).getByRole('button', { name: 'Ask Proposal Agent to revise' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('v1 already has those constraints.')
  })

  it('compliance reads the proposal but cannot ask or revise', async () => {
    viewAsOnLoad('cco-001')
    await openJohnson()
    expect(contextColumn().queryByRole('button', { name: 'Ask Proposal Agent' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/kit/__tests__/Checkbox.test.tsx src/kit/__tests__/NumberInput.test.tsx src/workspace/__tests__/constraint-form.test.ts src/workspace/__tests__/revise.test.tsx`
Expected: FAIL.

- [ ] **Step 3: The kit inputs**

```tsx
// src/kit/checkbox/Checkbox.tsx
import { useId } from 'react'

type CheckboxProps = { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; describedBy?: string }

export function Checkbox({ label, checked, onChange, disabled, describedBy }: CheckboxProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 appearance-none border border-ink-2 bg-face checked:bg-ink checked:inset-ring-3 checked:inset-ring-face disabled:cursor-not-allowed disabled:border-rule-2" />
      <label htmlFor={id} className="text-body text-ink">{label}</label>
    </div>
  )
}
```

```tsx
// src/kit/number-input/NumberInput.tsx
import { useId } from 'react'

type NumberInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  unit?: string
  error?: string
  disabled?: boolean
  /** Called on Enter and on blur: the caller turns the text into an edit. */
  onCommit?: () => void
}

/** A labelled number field. It holds text; parsing and validation belong to the caller and the engine. */
export function NumberInput({ label, value, onChange, unit, error, disabled, onCommit }: NumberInputProps) {
  const id = useId()
  const errorId = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-label uppercase text-ink-3">
        {label}{unit ? <> <span className="normal-case">{unit}</span></> : null}
      </label>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" value={value} disabled={disabled}
        aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)} onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCommit?.() } }}
        className="tabular w-full max-w-48 rounded-xs border border-ink bg-transparent px-3 py-1.5 text-copy text-ink aria-invalid:border-2 disabled:cursor-not-allowed disabled:border-rule-2 disabled:text-ink-3" />
      {error ? <p id={errorId} className="text-label normal-case text-ink">{error}</p> : null}
    </div>
  )
}
```

Add both to the kit gallery (`KitSections.tsx`, "Status codes and tags" pane): a `Checkbox` labelled "Harvest only: sell only lots at a loss" bound to local state, and a `NumberInput` labelled "Realised gains cap" with unit "USD" bound to local state.

- [ ] **Step 4: The form and the dialog**

```ts
// src/workspace/proposal/constraint-form.ts
import type { ProposalConstraint } from '@/types/workspace-proposal'
import type { AssetClass } from '@/types/portfolio'
import { ASSET_CLASS_LABELS } from '@/lib/labels'

export type ConstraintForm = { harvestOnly: boolean; capOn: boolean; cap: string; exclude: string }

const isAssetClass = (v: string): v is AssetClass => Object.prototype.hasOwnProperty.call(ASSET_CLASS_LABELS, v)

export function formFromConstraints(constraints: readonly ProposalConstraint[]): ConstraintForm {
  const cap = constraints.find((c) => c.kind === 'cap_realised_gains')
  const exclude = constraints.find((c) => c.kind === 'exclude_asset_class')
  return {
    harvestOnly: constraints.some((c) => c.kind === 'harvest_only'),
    capOn: cap !== undefined,
    cap: cap?.kind === 'cap_realised_gains' ? String(cap.usd) : '',
    exclude: exclude?.kind === 'exclude_asset_class' ? exclude.assetClass : '',
  }
}

/** The constraints to ask for. The agent adds "avoid self-washing buys" itself. */
export function constraintsFromForm(form: ConstraintForm): { ok: true; constraints: ProposalConstraint[] } | { ok: false; message: string } {
  const constraints: ProposalConstraint[] = []
  if (form.harvestOnly) constraints.push({ kind: 'harvest_only' })
  if (form.capOn) {
    const usd = Number(form.cap.replace(/[$,\s]/g, ''))
    if (form.cap.trim() === '' || !Number.isFinite(usd) || usd < 0) return { ok: false, message: 'Enter the cap as a dollar amount, zero or more.' }
    constraints.push({ kind: 'cap_realised_gains', usd })
  }
  if (form.exclude !== '') {
    if (!isAssetClass(form.exclude)) return { ok: false, message: 'Choose an asset class from the list.' }
    constraints.push({ kind: 'exclude_asset_class', assetClass: form.exclude })
  }
  return { ok: true, constraints }
}
```

```tsx
// src/workspace/proposal/ReviseDialog.tsx
import { useState, type FormEvent } from 'react'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { Dialog } from '@/kit/dialog/Dialog'
import { NumberInput } from '@/kit/number-input/NumberInput'
import { Select } from '@/kit/select/Select'
import { useReviseProposal } from '@/hooks/use-workspace'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { ProposalDetail } from '@/types/workspace-proposal'
import { constraintsFromForm, formFromConstraints } from './constraint-form'
import { latestVersionOf } from './latest-version'

type ReviseDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; detail: ProposalDetail }

export function ReviseDialog({ open, onOpenChange, detail }: ReviseDialogProps) {
  const latest = latestVersionOf(detail)
  const [form, setForm] = useState(() => formFromConstraints(latest.constraints))
  const [problem, setProblem] = useState<string>()
  const revise = useReviseProposal(detail.id)
  const classes = latest.preview.projectedDrift.assetClassDrifts.map((d) => d.assetClass).filter((c) => c !== 'cash')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = constraintsFromForm(form)
    if (!parsed.ok) { setProblem(parsed.message); return }
    setProblem(undefined)
    revise.mutate(parsed.constraints, { onSuccess: () => onOpenChange(false) })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Revise the proposal"
      description="The Proposal Agent drafts the next version under these constraints. It never buys anything that would wash one of the taxpayer's losses.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Checkbox label="Harvest only: sell only lots at a loss" checked={form.harvestOnly} onChange={(v) => setForm({ ...form, harvestOnly: v })} />
        <Checkbox label="Cap realised gains" checked={form.capOn} onChange={(v) => setForm({ ...form, capOn: v })} />
        {form.capOn ? (
          <NumberInput label="Realised gains cap" unit={latest.preview.currency} value={form.cap} error={problem}
            onChange={(v) => setForm({ ...form, cap: v })} />
        ) : null}
        <Select label="Leave untouched" value={form.exclude} onChange={(v) => setForm({ ...form, exclude: v })}
          options={[{ value: '', label: 'Nothing' }, ...classes.map((c) => ({ value: c, label: assetClassLabel(c) }))]} />
        {problem && !form.capOn ? <p role="alert" className="text-body">{problem}</p> : null}
        {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={revise.isPending}>Ask Proposal Agent to revise</Button>
        </div>
      </form>
    </Dialog>
  )
}
```

- [ ] **Step 5: Who may ask, the Ask control, the Revise action**

```ts
// src/workspace/thread/can-post.ts
import type { Directory, Thread } from '@/types/workspace'
import { composerModeOf } from './composer-mode'

/** A firm thread the viewer can post in: they may ask its drafting agents. The engine checks again on every request. */
export const canPostIn = (thread: Thread, viewerId: string, directory: Directory) =>
  thread.visibility !== 'client' && composerModeOf(thread, viewerId, directory).kind === 'post'
```

```tsx
// src/workspace/context/ProposalAgentControl.tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useCreateProposal, useProposals } from '@/hooks/use-workspace'
import type { AgentProfile, Thread } from '@/types/workspace'

export function ProposalAgentControl({ thread, agent }: { thread: Thread; agent: AgentProfile }) {
  const create = useCreateProposal(thread.id)
  const proposals = useProposals(thread.id)
  const [report, setReport] = useState<string>()
  const subject = thread.subject
  if (subject?.type !== 'account') return null
  const ask = () => {
    const drafted = (proposals.data ?? []).some((p) => p.accountId === subject.id)
    setReport(undefined)
    create.mutate(subject.id, {
      onSuccess: () => setReport(drafted ? `${agent.name} has already drafted this proposal; it is in the thread.` : `${agent.name} posted v1 in the thread.`),
    })
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <Button rank="secondary" disabled={create.isPending} onClick={ask}>{`Ask ${agent.name}`}</Button>
      {create.isError ? <p role="alert" className="text-body">{create.error.message}</p> : null}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
    </div>
  )
}
```

`AskAgents` takes `canPost: boolean`; it renders the finding agents' run buttons as before and, when `canPost`, one `ProposalAgentControl` per agent with `produces === 'proposals'`; it returns `null` when it would render nothing. `ContextColumn` passes `canPost={canPostIn(t, viewerId, dir)}` and renders `AskAgents` when the thread is not a client thread and has agents.

In `MessageView`, the `proposal` case passes a Revise action for a viewer who can post:

```tsx
    case 'proposal': {
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      const actions = canPostIn(thread, viewerId, directory) ? <ReviseAction proposalId={message.proposalId} /> : undefined
      return <ByAgent name={agent.name} at={message.at}><ProposalEmbed proposalId={message.proposalId} threadId={message.threadId} actions={actions} /></ByAgent>
    }
```

with `const { viewerId } = useViewer()` at the top of `MessageView`, and in the same file:

```tsx
function ReviseAction({ proposalId }: { proposalId: string }) {
  const [open, setOpen] = useState(false)
  const proposal = useProposal(proposalId)
  if (!proposal.data) return null
  return (
    <>
      <Button rank="secondary" onClick={() => setOpen(true)}>Revise</Button>
      {open ? <ReviseDialog open={open} onOpenChange={setOpen} detail={proposal.data} /> : null}
    </>
  )
}
```

(The dialog mounts only while open, so its form starts from the latest version each time.)

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/kit/__tests__/ src/workspace/__tests__/ src/__tests__/guardrails/`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/kit/checkbox src/kit/number-input src/kit/__tests__/Checkbox.test.tsx src/kit/__tests__/NumberInput.test.tsx src/workspace/proposal/constraint-form.ts src/workspace/proposal/ReviseDialog.tsx src/workspace/context src/workspace/thread src/app/pages/kit/KitSections.tsx src/workspace/__tests__/constraint-form.test.ts src/workspace/__tests__/revise.test.tsx
git commit -m "feat(workspace): ask the Proposal Agent and revise under constraints from the thread; kit checkbox and number input"
```

### Task 12: The workbench route and the side-by-side layout

The workbench is a full view inside the shell: it takes the main pane, the thread list steps aside, and the proposal's team thread moves to the right column as a live compact feed with its composer. Below the split breakpoint the thread drops under the workbench. This task delivers the route, the layout, the gate and header, and the live column; Tasks 13–14 fill the workbench body.

**Files:**
- Create: `src/workspace/workbench/WorkbenchPage.tsx`, `src/workspace/workbench/Workbench.tsx`, `src/workspace/workbench/WorkbenchThreadColumn.tsx`, `src/workspace/workbench/CompactMessage.tsx`, `src/workspace/workbench/use-workbench-thread-available.ts`
- Modify: `src/workspace/shell/context-column.ts`, `src/workspace/shell/WorkspaceShell.tsx`, `src/app/routes.tsx`, `src/app/use-destinations.ts`
- Test: `src/workspace/__tests__/workbench-layout.test.tsx`, `src/workspace/__tests__/context-column.test.ts`

**Interfaces:**
- Consumes: Task 9 `useProposal`, `useProposals`, `useThread`, `useDirectory`; Task 10 `ApprovalNote`, `authorName`, `proposalWorkbenchHref`; Phase 2 `Composer`, `isNotFound`, `useViewer`.
- Produces:

```ts
// src/workspace/shell/context-column.ts
export type ShellHandle = { contextColumn?: ContextColumn; threadList?: 'hidden' }
export function threadListHidden(matches: readonly UIMatch[]): boolean
// components
WorkbenchPage()                                   // route element for /proposals/:proposalId
Workbench({ detail: ProposalDetail; directory: Directory })   // Tasks 13–14 extend this file
WorkbenchThreadColumn()                           // the context column on the workbench route ("Live thread")
CompactMessage({ message: Message; directory: Directory })
// src/workspace/workbench/use-workbench-thread-available.ts
export function useWorkbenchThreadAvailable(): boolean
```

- [ ] **Step 1: Write the failing tests**

```ts
// src/workspace/__tests__/context-column.test.ts
import { it, expect } from 'vitest'
import type { UIMatch } from 'react-router-dom'
import { threadListHidden } from '@/workspace/shell/context-column'

const match = (handle: unknown): UIMatch => ({ id: 'x', pathname: '/', params: {}, data: undefined, handle })

it('a route hides the thread list only when its handle says so', () => {
  expect(threadListHidden([match(undefined), match({ threadList: 'hidden' })])).toBe(true)
  expect(threadListHidden([match(undefined), match({ contextColumn: undefined })])).toBe(false)
  expect(threadListHidden([])).toBe(false)
})
```

```tsx
// src/workspace/__tests__/workbench-layout.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { createProposal } from '@/services/workspace'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const liveThread = () => screen.getByRole('complementary', { name: 'Live thread' })

async function openWorkbench(path = '/proposals/prop-0001?from=th-johnson-review') {
  await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
  return view
}

describe('the workbench layout', () => {
  it('takes the main pane; the thread list steps aside; the team thread is live in the right column', async () => {
    await openWorkbench()
    expect(screen.queryByRole('navigation', { name: 'Threads' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(screen.getByRole('main')).toHaveTextContent('v1 is not approved')
    expect(screen.getByRole('main')).toHaveTextContent('The workbench never approves.')
    const feed = await within(liveThread()).findByRole('list', { name: 'Thread feed' })
    expect(feed).toHaveTextContent('Drafted the proposal (v1).')
    const user = userEvent.setup()
    await user.type(within(liveThread()).getByRole('textbox', { name: 'Message' }), 'Looking at the lots now.')
    await user.click(within(liveThread()).getByRole('button', { name: 'Post' }))
    await waitFor(() => expect(feed).toHaveTextContent('Looking at the lots now.'))
  })

  it('an unknown proposal is not found, with no thread column', async () => {
    renderRoutes(routes, '/proposals/prop-9999')
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposal not found' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Live thread' })).toBeNull()
  })

  it('a client is told the proposal is not found', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/proposals/prop-0001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Proposal not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Johnson rebalance')
  })

  it('switching "view as" to Robert on the workbench goes home', async () => {
    const { router } = await openWorkbench()
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(document.body).not.toHaveTextContent('Johnson rebalance')
  })

  it('the command line offers "Proposal · Johnson rebalance"', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const { router } = renderRoutes(routes, '/')
    await screen.findByRole('heading', { level: 1, name: 'Workspace' })
    const user = userEvent.setup()
    await user.keyboard('/')
    const box = await screen.findByRole('combobox', { name: 'Go to' })
    await waitFor(() => expect(box).toHaveFocus())
    await waitFor(() => expect(screen.getAllByRole('option').map((o) => o.textContent)).toContain('Proposal · Johnson rebalance'))
    await user.keyboard('Johnson rebalance{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/proposals/prop-0001'))
    expect(router.state.location.search).toBe('?from=th-johnson-review')
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/context-column.test.ts src/workspace/__tests__/workbench-layout.test.tsx`
Expected: FAIL — no route, no `threadListHidden`.

- [ ] **Step 3: The shell handle and the layout**

In `context-column.ts`:

```ts
/** A route's `handle` provides the context column, and may ask the shell to step the thread list aside for a full view. */
export type ShellHandle = { contextColumn?: ContextColumn; threadList?: 'hidden' }

const hidesThreadList = (handle: unknown): boolean =>
  typeof handle === 'object' && handle !== null && 'threadList' in handle && handle.threadList === 'hidden'

export function threadListHidden(matches: readonly UIMatch[]): boolean {
  return matches.some((m) => hidesThreadList(m.handle))
}
```

In `WorkspaceShell.tsx`: read `const listHidden = threadListHidden(matches)` beside `contextColumnOf(matches)` (hold `useMatches()` in `matches`); register the `[` jump key only when the list is shown; render the `<nav>` only when the list is shown; and set the grid classes:

```tsx
        <main id={MAIN_ID} tabIndex={-1} className={cn(
          'col-span-12 min-w-0',
          listHidden ? (context ? 'split:col-span-9' : '') : cn('narrow:col-span-8', context ? 'split:col-span-6' : 'split:col-span-9'),
        )}>
          <Outlet />
        </main>
        {context ? (
          <div id={CONTEXT_COLUMN_ID} tabIndex={-1} className={cn(
            'col-span-12 min-w-0',
            listHidden ? 'split:col-span-3' : 'narrow:col-span-8 narrow:col-start-5 split:col-span-3 split:col-start-auto',
          )}>
            <SidePanel label={context.label}><context.Content /></SidePanel>
          </div>
        ) : null}
```

- [ ] **Step 4: The route and the command line**

`routes.tsx`:

```tsx
const workbenchHandle: ShellHandle = {
  contextColumn: { label: 'Live thread', Content: WorkbenchThreadColumn, useAvailable: useWorkbenchThreadAvailable },
  threadList: 'hidden',
}
// inside the WorkspaceShell children, after accounts/:accountId:
          { path: 'proposals/:proposalId', element: <WorkbenchPage />, handle: workbenchHandle },
```

`use-destinations.ts`: read `const proposals = useProposals(undefined, firmViewer).data ?? []` and add, after the accounts:

```ts
    ...proposals.map((p) => ({ id: `proposal-${p.id}`, label: `Proposal · ${p.title}`, aliases: ['workbench'], run: () => navigate(proposalWorkbenchHref(p.id, p.threadId)) })),
```

- [ ] **Step 5: The page, the header, the live column**

```ts
// src/workspace/workbench/use-workbench-thread-available.ts
import { useParams } from 'react-router-dom'
import { useDirectory, useProposal } from '@/hooks/use-workspace'

/** The live thread shows only while the proposal is readable; the page itself reports why not. */
export function useWorkbenchThreadAvailable(): boolean {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench needs a proposal id')
  const proposal = useProposal(proposalId)
  const directory = useDirectory()
  return !proposal.isError && !directory.isError
}
```

```tsx
// src/workspace/workbench/WorkbenchPage.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useDirectory, useProposal } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { Workbench } from './Workbench'

export function WorkbenchPage() {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench route needs a proposal id')
  return <WorkbenchGate key={proposalId} proposalId={proposalId} />
}

/** Firm-only: a client is told the proposal is not found, and a switch to someone who cannot see it goes home. */
function WorkbenchGate({ proposalId }: { proposalId: string }) {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const proposal = useProposal(proposalId)
  const directory = useDirectory()
  const hiddenFromNewViewer = viewerId !== openedAs && proposal.isError && isNotFound(proposal.error)
  useEffect(() => {
    if (hiddenFromNewViewer) navigate('/', { replace: true })
  }, [hiddenFromNewViewer, navigate])

  if (hiddenFromNewViewer || proposal.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  if (proposal.isError) return isNotFound(proposal.error) ? <ProposalNotFound /> : <p role="alert" className="text-body">{proposal.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <Workbench detail={proposal.data} directory={directory.data} />
}

function ProposalNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Proposal not found</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
```

```tsx
// src/workspace/workbench/Workbench.tsx
import { Link, useSearchParams } from 'react-router-dom'
import { fmtTimestamp } from '@/kit/measure'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { authorName } from '@/workspace/proposal/author-name'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import type { Directory } from '@/types/workspace'
import type { ProposalDetail } from '@/types/workspace-proposal'

export function Workbench({ detail, directory }: { detail: ProposalDetail; directory: Directory }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? detail.threadId
  const latest = latestVersionOf(detail)
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link to={`/t/${encodeURIComponent(from)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Back to the thread</Link>
        <span className="text-label uppercase text-ink-3">Proposal</span>
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{detail.title}</h1>
        <p className="tabular text-label text-ink-3">{`v${latest.n} latest · ${authorName(latest.author, directory)} · ${fmtTimestamp(latest.createdAt)} · fingerprint ${latest.fingerprint}`}</p>
        <ApprovalNote state={detail.approval} />
        <p className="text-body text-ink-2">The workbench never approves. Approval is a recorded act in the thread.</p>
      </header>
    </div>
  )
}
```

```tsx
// src/workspace/workbench/CompactMessage.tsx
import type { ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { authorName } from '@/workspace/proposal/author-name'
import type { AgentId, Directory, Message } from '@/types/workspace'

const agentName = (directory: Directory, id: AgentId) => directory.agents.find((a) => a.id === id)?.name ?? id

/** One message, as the workbench's live thread shows it: who, when, and one line. */
export function CompactMessage({ message, directory }: { message: Message; directory: Directory }) {
  switch (message.kind) {
    case 'text': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.body}</Line>
    case 'agent_finding': return <Line who={agentName(directory, message.agentId)} at={message.at}>{message.claim}</Line>
    case 'embed': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.embed === 'drift' ? 'Shared the drift reading.' : 'Shared a rebalance preview.'}</Line>
    case 'proposal': return <Line who={agentName(directory, message.agentId)} at={message.at}>Drafted the proposal (v1).</Line>
    case 'proposal_version': return <Line who={authorName(message.author, directory)} at={message.at}>{`v${message.version} · ${message.changeSummary}`}</Line>
    case 'act': return <Line who="Record" at={message.at}>{`Binding act recorded · ${message.actId}`}</Line>
    case 'carried': return <Line who={personIn(directory, message.carriedBy).name} at={message.at}>{`From the Brief: ${message.finding.claim}`}</Line>
    case 'brief_summary': return <Line who="Brief" at={message.at}>Ranked summary.</Line>
  }
}

function Line({ who, at, children }: { who: string; at: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline gap-2 text-label">
        <span className="font-semibold uppercase text-ink-2">{who}</span>
        <span className="tabular ml-auto text-ink-3">{fmtTimestamp(at)}</span>
      </div>
      <p className="whitespace-pre-line text-body">{children}</p>
    </div>
  )
}
```

```tsx
// src/workspace/workbench/WorkbenchThreadColumn.tsx
import { Link, useParams } from 'react-router-dom'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { useDirectory, useProposal, useThread } from '@/hooks/use-workspace'
import { Composer } from '@/workspace/thread/Composer'
import { CompactMessage } from './CompactMessage'

/** The proposal's team thread, live beside the workbench: the same queries as the thread page, so both update together. */
export function WorkbenchThreadColumn() {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench needs a proposal id')
  const proposal = useProposal(proposalId)
  if (proposal.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (proposal.isError) return null
  return <ThreadFeed threadId={proposal.data.threadId} />
}

function ThreadFeed({ threadId }: { threadId: string }) {
  const thread = useThread(threadId)
  const directory = useDirectory()
  if (thread.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (thread.isError) return <p role="alert" className="text-body">{thread.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const { thread: t, messages } = thread.data
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-body font-semibold">{t.title}</span>
        <Link to={`/t/${encodeURIComponent(t.id)}`} className="text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Open the thread</Link>
      </div>
      <VisibilityBand visibility={t.visibility} scale="message" />
      <ol aria-label="Thread feed" className="flex min-w-0 flex-col">
        {messages.map((m) => (
          <li key={m.id} className="min-w-0 border-b border-rule py-3 first:pt-0 last:border-b-0">
            <CompactMessage message={m} directory={directory.data} />
          </li>
        ))}
      </ol>
      <Composer thread={t} directory={directory.data} />
    </div>
  )
}
```

- [ ] **Step 6: Run the tests, including the headings guard (it renders `/proposals/:proposalId` literally and expects one h1)**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/ src/__tests__/guardrails/ src/app/__tests__/`
Expected: PASS. The "keyboard in the shell" destination list is unchanged when no proposal exists.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/workspace/workbench src/workspace/shell/context-column.ts src/workspace/shell/WorkspaceShell.tsx src/app/routes.tsx src/app/use-destinations.ts src/workspace/__tests__/context-column.test.ts src/workspace/__tests__/workbench-layout.test.tsx
git commit -m "feat(workspace): the proposal workbench route, side by side with its live team thread"
```

### Task 13: The workbench body — legs, lots and summary

**Files:**
- Modify: `src/kit/data-table/types.ts`, `src/kit/data-table/DataTable.tsx` (row keys, muted rows, wrapping columns), `src/workspace/workbench/Workbench.tsx`
- Create: `src/workspace/workbench/leg-rows.ts`, `src/workspace/workbench/WorkbenchLegs.tsx`, `src/workspace/workbench/LegDetail.tsx`, `src/workspace/workbench/WorkbenchSummary.tsx`, `src/workspace/workbench/DriftComparison.tsx`, `src/workspace/workbench/RestrictionRulers.tsx`, `src/workspace/workbench/HeldAwayList.tsx`
- Test: `src/kit/__tests__/DataTable.test.tsx` (append), `src/workspace/__tests__/leg-rows.test.ts`, `src/workspace/__tests__/workbench-body.test.tsx`

**Interfaces:**
- Consumes: Task 10 parts (`legStatus`, `SIDE_WORDS`, `RESIDUAL_WORDS`, `restrictionSource`, `taxScope`, `PretradeNotes`); `useTaxLots`, `usePositions`, `useDrift`, `useAccount`, `useHeldAway`; kit `TaxTape`, `Gauge`, `WindowRuler`, `Checkbox`, `NumberInput`, `Tag`.
- Produces:

```ts
// src/kit/data-table/types.ts
export type Column<T> = { /* existing */ wrap?: boolean }          // a column whose text may wrap
export type RowKey<T> = { key: string; run: (row: T) => void }
// DataTable gains props: rowKeys?: readonly RowKey<T>[]; mutedRow?: (row: T) => boolean
// src/workspace/workbench/leg-rows.ts
export type LegRow = { symbol: string; name: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; shortTerm?: number; longTerm?: number; washed?: number; restrictedTo?: string; status: Status; excluded: boolean }
export function legRows(view: DraftPreview): LegRow[]
// components (callbacks optional: without them the parts are read-only; Task 14 passes them)
WorkbenchLegs({ view, caption, onExpand, onToggleExclude? })
LegDetail({ accountId, view, symbol, excluded, quantity?, lotIds?, onToggleExclude?, onQuantity?, onLots? })
WorkbenchSummary({ detail, view })
```

- [ ] **Step 1: Write the failing tests**

Append to `src/kit/__tests__/DataTable.test.tsx`:

```tsx
describe('DataTable row keys, muted rows, wrapping columns', () => {
  it('runs a row key on the focused row and stops it reaching the page', async () => {
    const run = vi.fn()
    const pageKeys = vi.fn()
    window.addEventListener('keydown', pageKeys)
    renderTable({ rowKeys: [{ key: 'x', run }] })
    const row = screen.getAllByRole('row')[2]!
    act(() => row.focus())
    await userEvent.keyboard('x')
    expect(run).toHaveBeenCalledWith(rows[1])
    expect(pageKeys).not.toHaveBeenCalled()
    window.removeEventListener('keydown', pageKeys)
  })
  it('marks a muted row', () => {
    renderTable({ mutedRow: (r) => r.symbol === 'INTC' })
    expect(screen.getByRole('row', { name: /INTC/ })).toHaveAttribute('data-muted', 'true')
    expect(screen.getByRole('row', { name: /SPY/ })).not.toHaveAttribute('data-muted')
  })
  it('lets a wrapping column wrap', () => {
    render(<DataTable caption="Names" rows={rows} getRowId={(r) => r.id} noun={{ singular: 'row', plural: 'rows' }}
      columns={[{ id: 'symbol', header: 'Symbol', cell: (r) => r.symbol, wrap: true }]} />)
    expect(screen.getByRole('cell', { name: 'SPY' })).toHaveClass('whitespace-normal')
  })
})
```

```ts
// src/workspace/__tests__/leg-rows.test.ts
import { it, expect } from 'vitest'
import { legRows } from '@/workspace/workbench/leg-rows'
import { buildVersion } from '@/mocks/workspace/proposal-engine'

it('lists the legs in the engine\'s order, then the excluded ones, with the engine\'s figures', () => {
  const r = buildVersion('acc-002', [{ kind: 'avoid_self_wash' }], [{ kind: 'exclude', symbol: 'QAI' }])
  if (!r.ok) throw new Error(r.message)
  const rows = legRows(r.built)
  expect(rows.map((l) => [l.symbol, l.excluded])).toEqual([
    ['INTC', false], ['SPY', false], ['EFA', false], ['VWO', false], ['AGG', false], ['GLD', false], ['ETHE', false], ['IBIT', false], ['QAI', true],
  ])
  expect(rows[0]).toMatchObject({ name: 'Intel Corp.', side: 'sell', quantity: 7_000, longTerm: -45_850, shortTerm: 0, washed: 0, restrictedTo: '2026-03-27', status: 'CLEAR' })
  expect(rows[2]).toMatchObject({ symbol: 'EFA', side: 'buy', shortTerm: undefined, washed: undefined, restrictedTo: undefined })
})
```

(`leg-rows.test.ts` imports the engine directly to build a real version; it is a pure-function test.)

```tsx
// src/workspace/__tests__/workbench-body.test.tsx
import { describe, it, expect } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { createProposal } from '@/services/workspace'

async function openWorkbench() {
  await createProposal('user-001', 'th-johnson-review', 'acc-002')
  renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
  return screen.findByRole('table', { name: 'Legs · v1' })
}

describe('the workbench body', () => {
  it('shows every leg with name, side, quantity, value, realised result by character, washed part, restriction and pre-trade', async () => {
    const legs = await openWorkbench()
    expect(within(legs).getAllByRole('row')).toHaveLength(10)
    const intc = within(legs).getByRole('row', { name: /^INTC/ })
    expect(intc).toHaveTextContent('Intel Corp.')
    expect(intc).toHaveTextContent('7,000')
    expect(intc).toHaveTextContent('2026-03-27')
    expect(intc).toHaveTextContent('CLEAR')
  })

  it('Enter on a sell leg shows its lots, the ones it sells selected', async () => {
    const legs = await openWorkbench()
    const spy = within(legs).getByRole('row', { name: /^SPY/ })
    act(() => spy.focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · SPY' })
    expect(within(detail).getByRole('checkbox', { name: /^lot-pos-020-0/ })).toBeChecked()
    expect(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ })).not.toBeChecked()
    expect(within(detail).getByRole('textbox', { name: 'Quantity sh' })).toHaveValue('758')
  })

  it('summarises the tax, the drift before and after, the restrictions and the held-away accounts', async () => {
    await openWorkbench()
    const tape = await screen.findByRole('region', { name: 'Tax effect estimate' })
    expect(tape).toHaveTextContent('10,422')
    expect(tape).toHaveTextContent('Nets this proposal')
    expect(await screen.findByRole('region', { name: 'Drift after' })).toHaveTextContent('no market to sell into')
    expect(screen.getByRole('region', { name: 'Drift before' })).toBeInTheDocument()
    const restrictions = screen.getByRole('region', { name: 'Repurchase restrictions' })
    expect(restrictions).toHaveTextContent('recorded · sale rs-001 of 2026-02-20 in acc-002')
    expect(restrictions).toHaveTextContent("projected · this proposal's sale in acc-002")
    const away = await screen.findByRole('region', { name: 'Held-away accounts' })
    expect(away).toHaveTextContent('Vanguard')
    expect(away).toHaveTextContent('NOT VISIBLE TO WASH-SALE CHECKS')
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/kit/__tests__/DataTable.test.tsx src/workspace/__tests__/leg-rows.test.ts src/workspace/__tests__/workbench-body.test.tsx`
Expected: FAIL.

- [ ] **Step 3: DataTable**

`types.ts`: add `wrap?: boolean` to `Column<T>` (doc: "Text in this column may wrap; the row grows to fit.") and `export type RowKey<T> = { key: string; run: (row: T) => void }`.

`DataTable.tsx`: add `rowKeys?: readonly RowKey<T>[]` and `mutedRow?: (row: T) => boolean` to the props and destructuring. In `onKeyDown`, after the `Enter` branch:

```tsx
    else {
      const binding = rowKeys?.find((k) => k.key === e.key)
      const r = sorted[index]
      if (binding && r) { e.preventDefault(); e.stopPropagation(); binding.run(r.original) }
    }
```

On each body `<tr>`: `data-muted={mutedRow?.(row.original) ? 'true' : undefined}` and add `mutedRow?.(row.original) && 'text-ink-3'` to its class list. On each body `<td>`: replace the fixed `whitespace-nowrap` with `col?.wrap ? 'min-w-32 whitespace-normal py-1' : 'whitespace-nowrap'`.

- [ ] **Step 4: Rows, legs table, leg detail**

```ts
// src/workspace/workbench/leg-rows.ts
import type { Status } from '@/kit/status/status'
import type { DraftPreview } from '@/types/workspace-proposal'
import { legStatus } from '@/workspace/proposal/leg-status'

export type LegRow = {
  symbol: string; name: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number
  shortTerm?: number; longTerm?: number; washed?: number; restrictedTo?: string; status: Status; excluded: boolean
}

/** The workbench's rows: the version's legs as the engine settled them, then the legs the edits excluded, as the agent proposed them. */
export function legRows(view: DraftPreview): LegRow[] {
  const traded = view.preview.trades.map((t, i): LegRow => {
    const facts = view.legFacts.find((f) => f.symbol === t.symbol)
    const sell = t.side === 'sell'
    return {
      symbol: t.symbol, name: t.name, side: t.side, quantity: t.quantity, estimatedValue: t.estimatedValue,
      shortTerm: sell ? t.realisedShortTerm : undefined, longTerm: sell ? t.realisedLongTerm : undefined,
      washed: sell ? facts?.washed ?? 0 : undefined, restrictedTo: t.repurchaseBlockedUntil,
      status: legStatus(view.pretrade, i, t.symbol), excluded: false,
    }
  })
  const excluded = view.excludedLegs.map((l): LegRow => ({ ...l, status: 'OPEN', excluded: true }))
  return [...traded, ...excluded]
}
```

```tsx
// src/workspace/workbench/WorkbenchLegs.tsx
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { fmtDate, fmtMoney, fmtQuantity, fmtResult } from '@/kit/measure'
import { SIDE_WORDS } from '@/workspace/proposal/leg-status'
import type { DraftPreview } from '@/types/workspace-proposal'
import { legRows } from './leg-rows'

type WorkbenchLegsProps = {
  view: DraftPreview
  caption: string
  onExpand: (symbol: string) => void
  onToggleExclude?: (symbol: string) => void
}

const result = (v: number | undefined) => (v === undefined ? <NotApplicable /> : fmtResult(v))

export function WorkbenchLegs({ view, caption, onExpand, onToggleExclude }: WorkbenchLegsProps) {
  const currency = view.preview.currency
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <DataTable caption={caption} rows={legRows(view)} getRowId={(r) => r.symbol} noun={{ singular: 'leg', plural: 'legs' }}
        onActivate={(r) => onExpand(r.symbol)}
        rowKeys={onToggleExclude ? [{ key: 'x', run: (r) => onToggleExclude(r.symbol) }] : []}
        mutedRow={(r) => r.excluded}
        columns={[
          { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol },
          { id: 'name', header: 'Name', wrap: true, cell: (r) => r.name },
          { id: 'side', header: 'Side', cell: (r) => SIDE_WORDS[r.side] },
          { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (r) => <Num text={fmtQuantity(r.quantity)} /> },
          { id: 'value', header: 'Value', unit: currency, align: 'right', cell: (r) => fmtMoney(r.estimatedValue) },
          { id: 'st', header: 'ST', unit: currency, align: 'right', cell: (r) => result(r.shortTerm) },
          { id: 'lt', header: 'LT', unit: currency, align: 'right', cell: (r) => result(r.longTerm) },
          { id: 'washed', header: 'Washed', unit: currency, align: 'right', cell: (r) => result(r.washed) },
          { id: 'restricted', header: 'No buy-back to', cell: (r) => (r.restrictedTo ? fmtDate(r.restrictedTo) : '') },
          { id: 'check', header: 'Pre-trade', cell: (r) => (r.excluded ? <Tag>EXCLUDED</Tag> : <StatusCode status={r.status} />) },
        ]} />
      <p className="text-label text-ink-3">
        {onToggleExclude ? 'Enter shows a leg and its lots · x excludes or includes it · ⌘S or Ctrl+S saves the draft' : 'Enter shows a leg and its lots'}
        {' · ST and LT are realised short- and long-term results; washed is the part of a loss the wash-sale rule takes.'}
      </p>
    </div>
  )
}
```

```tsx
// src/workspace/workbench/LegDetail.tsx
import { useEffect, useId, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { NumberInput } from '@/kit/number-input/NumberInput'
import { fmtDate, fmtQuantity, fmtResult } from '@/kit/measure'
import { useTaxLots } from '@/hooks/use-accounts'
import { usePositions } from '@/hooks/use-portfolio'
import type { DraftPreview } from '@/types/workspace-proposal'

type LegDetailProps = {
  accountId: string
  view: DraftPreview
  symbol: string
  excluded: boolean
  /** The draft's quantity and lots for this leg, when it edits them. */
  quantity?: number
  lotIds?: string[]
  onToggleExclude?: () => void
  onQuantity?: (quantity: number | undefined) => void
  onLots?: (lotIds: string[]) => void
}

export function LegDetail({ accountId, view, symbol, excluded, quantity, lotIds, onToggleExclude, onQuantity, onLots }: LegDetailProps) {
  const titleId = useId()
  const lots = useTaxLots(accountId)
  const positions = usePositions(accountId)
  const trade = view.preview.trades.find((t) => t.symbol === symbol) ?? view.excludedLegs.find((l) => l.symbol === symbol)
  const shownQuantity = quantity ?? trade?.quantity
  const [text, setText] = useState(shownQuantity === undefined ? '' : String(shownQuantity))
  useEffect(() => setText(shownQuantity === undefined ? '' : String(shownQuantity)), [shownQuantity])
  if (!trade) return null
  const editable = onQuantity !== undefined
  const position = positions.data?.find((p) => p.symbol === symbol)
  const positionLots = position ? (lots.data ?? []).filter((l) => l.positionId === position.id) : []
  const selected = lotIds ?? view.legFacts.find((f) => f.symbol === symbol)?.lotIds ?? []
  // Blank returns to the agent's quantity; an unchanged field (a blur with no edit) changes nothing.
  const commit = () => {
    if (!onQuantity) return
    const typed = text.trim() === '' ? undefined : Number(text.replace(/,/g, ''))
    if (typed === shownQuantity && quantity !== undefined) return
    if (typed === trade?.quantity && quantity === undefined) return
    onQuantity(typed)
  }
  const toggleLot = (lotId: string, on: boolean) => {
    if (!onLots) return
    const next = new Set(selected)
    if (on) next.add(lotId)
    else next.delete(lotId)
    onLots(positionLots.map((l) => l.id).filter((id) => next.has(id)))
  }
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Leg · ${symbol}`}</h2>
        <span className="text-body">{trade.name}</span>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <NumberInput label="Quantity" unit="sh" value={text} onChange={setText} onCommit={commit} disabled={!editable || excluded} />
        {onToggleExclude ? <Button rank="secondary" onClick={onToggleExclude}>{excluded ? 'Include this leg' : 'Exclude this leg'}</Button> : null}
      </div>
      {trade.side === 'sell' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-label uppercase text-ink-3">Lots sold · specific identification</legend>
          {lots.isPending || positions.isPending ? <p role="status" className="text-body text-ink-3">Loading the lots…</p> : null}
          {lots.isError ? <p role="alert" className="text-body">{lots.error.message}</p> : null}
          {positionLots.map((lot) => (
            <Checkbox key={lot.id} checked={selected.includes(lot.id)} disabled={!onLots || excluded}
              onChange={(on) => toggleLot(lot.id, on)}
              label={`${lot.id} · bought ${fmtDate(lot.purchaseDate)} · ${fmtQuantity(lot.quantity)} sh · ${lot.holdingPeriod === 'long' ? 'long-term' : 'short-term'} · ${fmtResult(lot.gainLoss)} USD`} />
          ))}
        </fieldset>
      ) : null}
    </section>
  )
}
```

(`useEffect(() => setText(...))` keeps the field in step when the version on screen changes; the field still holds whatever the presenter is typing until it is committed.)

- [ ] **Step 5: The summary**

```tsx
// src/workspace/workbench/DriftComparison.tsx
import { Gauge } from '@/kit/gauge/Gauge'
import { sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { useDrift } from '@/hooks/use-portfolio'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import type { ProjectedDrift } from '@/services/oms'

/** Drift before and after the trades on one shared scale, each class still away from target with the engine's reason. */
export function DriftComparison({ accountId, projected }: { accountId: string; projected: ProjectedDrift }) {
  const drift = useDrift(accountId)
  if (drift.isPending) return <p role="status" className="text-body text-ink-3">Loading the drift reading…</p>
  if (drift.isError) return <p role="alert" className="text-body">{drift.error.message}</p>
  const before = drift.data.assetClassDrifts
  const domain = sharedGaugeDomain([...before.map((d) => d.drift), ...projected.assetClassDrifts.map((d) => d.drift)], projected.driftTolerance)
  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-auto">
      <section aria-label="Drift before" className="flex flex-col gap-2">
        <h3 className="text-label uppercase text-ink-2">Before</h3>
        {before.map((d) => <Gauge key={d.assetClass} label={assetClassLabel(d.assetClass)} drift={d.drift} band={drift.data.driftTolerance} domain={domain} />)}
      </section>
      <section aria-label="Drift after" className="flex flex-col gap-2">
        <h3 className="text-label uppercase text-ink-2">After</h3>
        {projected.assetClassDrifts.map((d) => (
          <div key={d.assetClass} className="flex flex-col gap-0.5">
            <Gauge label={assetClassLabel(d.assetClass)} drift={d.drift} band={projected.driftTolerance} domain={domain} />
            {d.residualReason ? <p className="pl-43 text-label text-ink-3">{RESIDUAL_WORDS[d.residualReason]}</p> : null}
          </div>
        ))}
      </section>
    </div>
  )
}
```

```tsx
// src/workspace/workbench/RestrictionRulers.tsx
import { useId } from 'react'
import { WindowRuler } from '@/kit/window-ruler/WindowRuler'
import { todayISO } from '@/lib/clock'
import { restrictionSource } from '@/workspace/proposal/restriction-words'
import type { RepurchaseRestriction } from '@/services/oms'

export function RestrictionRulers({ restrictions }: { restrictions: RepurchaseRestriction[] }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <h3 id={titleId} className="text-label uppercase text-ink-2">Repurchase restrictions</h3>
      {restrictions.length === 0 ? <p className="text-body text-ink-3">None for this taxpayer.</p> : restrictions.map((r) => (
        <div key={`${r.symbol}:${r.source.kind}:${r.until}`} className="flex min-w-0 flex-col gap-1 overflow-x-auto">
          <WindowRuler label={`${r.symbol} · ${r.source.kind}`} start={r.start} end={r.until} today={todayISO()}
            events={[{ date: r.source.saleDate, label: r.source.kind === 'recorded' ? 'Loss sale' : 'Proposed sale' }]} />
          <p className="text-label text-ink-3">{restrictionSource(r)}</p>
        </div>
      ))}
    </section>
  )
}
```

```tsx
// src/workspace/workbench/HeldAwayList.tsx
import { useId } from 'react'
import { Tag } from '@/kit/tag/Tag'
import { fmtMoney } from '@/kit/measure'
import { useAccount } from '@/hooks/use-accounts'
import { useHeldAway } from '@/hooks/use-held-away'

export function HeldAwayList({ accountId }: { accountId: string }) {
  const titleId = useId()
  const account = useAccount(accountId)
  const away = useHeldAway(account.data?.householdId ?? '')
  if (account.isError) return <p role="alert" className="text-body">{account.error.message}</p>
  if (away.isError) return <p role="alert" className="text-body">{away.error.message}</p>
  if (!away.data) return <p role="status" className="text-body text-ink-3">Loading held-away accounts…</p>
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <h3 id={titleId} className="text-label uppercase text-ink-2">Held-away accounts</h3>
      {away.data.length === 0 ? <p className="text-body text-ink-3">None on record.</p> : (
        <ul className="flex flex-col gap-1.5 text-body">
          {away.data.map((h) => (
            <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>{`${h.institutionName} · ${h.accountType}`}</span>
              <span className="tabular">{fmtMoney(h.estimatedValue)} <span className="text-ink-3">USD</span></span>
              <Tag>NOT VISIBLE TO WASH-SALE CHECKS</Tag>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

```tsx
// src/workspace/workbench/WorkbenchSummary.tsx
import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { fmtResult } from '@/kit/measure'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { PretradeNotes } from '@/workspace/proposal/PretradeNotes'
import { taxScope } from '@/workspace/proposal/tax-scope'
import type { DraftPreview, ProposalDetail } from '@/types/workspace-proposal'
import { DriftComparison } from './DriftComparison'
import { HeldAwayList } from './HeldAwayList'
import { RestrictionRulers } from './RestrictionRulers'

export function WorkbenchSummary({ detail, view }: { detail: ProposalDetail; view: DraftPreview }) {
  const s = view.summary
  return (
    <>
      <Pane title="Tax effect" meta="return-level estimate against this year's results">
        <TaxTape gains={s.gains} losses={s.losses} netShortTerm={s.netShortTerm} netLongTerm={s.netLongTerm}
          grossTax={s.grossTax} netTax={s.netTax} scope={taxScope(view.preview)} rateBasis={RATE_DISCLOSURE} />
        {s.washed !== 0 ? <Reading label="Washed · deferred or disallowed" value={fmtResult(s.washed)} unit={view.preview.currency} /> : null}
      </Pane>
      <Pane title="Drift before and after">
        <DriftComparison accountId={detail.accountId} projected={view.preview.projectedDrift} />
      </Pane>
      <Pane title="Wash-sale taxpayer">
        <RestrictionRulers restrictions={view.preview.repurchaseRestrictions} />
        <HeldAwayList accountId={detail.accountId} />
      </Pane>
      <Pane title="Pre-trade check">
        <PretradeNotes pretrade={view.pretrade} />
      </Pane>
    </>
  )
}
```

In `Workbench.tsx`, below the header, render the body against the latest version (Task 14 swaps in the draft):

```tsx
  const [expanded, setExpanded] = useState<string>()
  // …header as before…
      <Pane title="Legs" meta={`v${latest.n}`}>
        <WorkbenchLegs view={latest} caption={`Legs · v${latest.n}`} onExpand={(s) => setExpanded((open) => (open === s ? undefined : s))} />
        {expanded ? <LegDetail accountId={detail.accountId} view={latest} symbol={expanded} excluded={latest.excludedLegs.some((l) => l.symbol === expanded)} /> : null}
      </Pane>
      <WorkbenchSummary detail={detail} view={latest} />
```

(`Pane` renders its `title` as the section heading; `WorkbenchSummary`'s panes follow.)

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/kit/__tests__/ src/workspace/__tests__/ src/__tests__/guardrails/`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/kit/data-table src/kit/__tests__/DataTable.test.tsx src/workspace/workbench src/workspace/__tests__/leg-rows.test.ts src/workspace/__tests__/workbench-body.test.tsx
git commit -m "feat(workspace): workbench legs with lots, tax tape, drift before and after, restrictions and held-away accounts"
```

### Task 14: Editing in the workbench — draft version, live preview, save, keyboard

**Files:**
- Create: `src/workspace/workbench/edit-draft.ts`, `src/workspace/workbench/use-draft-version.ts`, `src/workspace/workbench/use-save-shortcut.ts`, `src/workspace/workbench/DraftBar.tsx`
- Modify: `src/workspace/workbench/Workbench.tsx`
- Test: `src/workspace/__tests__/edit-draft.test.ts`, `src/workspace/__tests__/workbench-edit.test.tsx`

**Interfaces:**
- Consumes: Task 9 `useProposalPreview`, `useSaveVersion`, `useThread`; Task 11 `canPostIn`; Task 13 components.
- Produces:

```ts
// src/workspace/workbench/edit-draft.ts
export type DraftState = { base: number; edits: LegEdit[] }      // base: the version the draft builds on
export type DraftAction =
  | { type: 'toggle_exclude'; symbol: string }
  | { type: 'set_quantity'; symbol: string; quantity: number | undefined }
  | { type: 'set_lots'; symbol: string; lotIds: string[] }
  | { type: 'reset'; base: number; edits: LegEdit[] }
export function draftReducer(state: DraftState, action: DraftAction): DraftState
export function normaliseDraftEdits(edits: readonly LegEdit[]): LegEdit[]
export function sameEdits(a: readonly LegEdit[], b: readonly LegEdit[]): boolean
export function isExcluded(edits: readonly LegEdit[], symbol: string): boolean
export function quantityOf(edits: readonly LegEdit[], symbol: string): number | undefined
export function lotsOf(edits: readonly LegEdit[], symbol: string): string[] | undefined
// src/workspace/workbench/use-draft-version.ts
export type DraftVersion = {
  edits: LegEdit[]; dispatch: (a: DraftAction) => void; dirty: boolean; view: DraftPreview
  previewPending: boolean; previewError: Error | null; newerArrived: boolean
  canSave: boolean; save: () => void; saving: boolean; saveError: Error | null; savedVersion?: number; discard: () => void; nextVersion: number
}
export function useDraftVersion(detail: ProposalDetail): DraftVersion
// src/workspace/workbench/use-save-shortcut.ts
export function useSaveShortcut(onSave: () => void, enabled: boolean): void   // ⌘S / Ctrl+S anywhere on the page
```

Edits form a draft version previewed live by the engine (`POST …/preview`); **Save as v{n}** posts the version line to the thread; **Discard** returns to the latest version. A version that arrives from the thread while the draft is clean replaces it; one that arrives while the draft has edits is announced, and the edits then apply on top of it. The workbench never approves.

- [ ] **Step 1: Write the failing tests**

```ts
// src/workspace/__tests__/edit-draft.test.ts
import { describe, it, expect } from 'vitest'
import { draftReducer, isExcluded, lotsOf, quantityOf, sameEdits } from '@/workspace/workbench/edit-draft'

const start = { base: 1, edits: [] }

describe('the draft reducer', () => {
  it('toggles an exclusion on and off', () => {
    const on = draftReducer(start, { type: 'toggle_exclude', symbol: 'QAI' })
    expect(isExcluded(on.edits, 'QAI')).toBe(true)
    expect(draftReducer(on, { type: 'toggle_exclude', symbol: 'QAI' }).edits).toEqual([])
  })
  it('sets and clears a quantity and lots, one edit per kind per symbol', () => {
    let s = draftReducer(start, { type: 'set_quantity', symbol: 'INTC', quantity: 6000 })
    s = draftReducer(s, { type: 'set_quantity', symbol: 'INTC', quantity: 5000 })
    expect(quantityOf(s.edits, 'INTC')).toBe(5000)
    s = draftReducer(s, { type: 'set_lots', symbol: 'SPY', lotIds: ['lot-pos-020-1'] })
    expect(lotsOf(s.edits, 'SPY')).toEqual(['lot-pos-020-1'])
    s = draftReducer(s, { type: 'set_quantity', symbol: 'INTC', quantity: undefined })
    expect(quantityOf(s.edits, 'INTC')).toBeUndefined()
    expect(s.edits).toHaveLength(1)
  })
  it('keeps an empty lot selection so the engine can refuse it', () => {
    expect(lotsOf(draftReducer(start, { type: 'set_lots', symbol: 'SPY', lotIds: [] }).edits, 'SPY')).toEqual([])
  })
  it('compares edit sets regardless of order, and resets to a base', () => {
    expect(sameEdits([{ kind: 'exclude', symbol: 'QAI' }, { kind: 'exclude', symbol: 'GLD' }], [{ kind: 'exclude', symbol: 'GLD' }, { kind: 'exclude', symbol: 'QAI' }])).toBe(true)
    expect(draftReducer({ base: 1, edits: [{ kind: 'exclude', symbol: 'QAI' }] }, { type: 'reset', base: 3, edits: [] })).toEqual({ base: 3, edits: [] })
  })
})
```

```tsx
// src/workspace/__tests__/workbench-edit.test.tsx
import { describe, it, expect } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const feed = () => within(screen.getByRole('complementary', { name: 'Live thread' })).getByRole('list', { name: 'Thread feed' })

async function openWorkbench() {
  await createProposal('user-001', 'th-johnson-review', 'acc-002')
  renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
  return screen.findByRole('table', { name: 'Legs · v1' })
}

describe('editing a draft version', () => {
  it('x excludes the focused leg, the engine previews the draft, and Save posts v2 to the live thread', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    const draftLegs = await screen.findByRole('table', { name: 'Legs · draft' })
    await waitFor(() => expect(within(draftLegs).getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true'))
    expect(within(draftLegs).getByRole('row', { name: /^QAI/ })).toHaveTextContent('EXCLUDED')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(bar).toHaveTextContent('Draft · not saved')
    const save = within(bar).getByRole('button', { name: 'Save as v2' })
    await waitFor(() => expect(save).toBeEnabled())
    await userEvent.setup().click(save)
    expect(await within(bar).findByRole('status')).toHaveTextContent('Saved as v2 · posted to the thread.')
    await waitFor(() => expect(feed()).toHaveTextContent('v2 · Workbench edits: excluded IQ Hedge Multi-Strategy Tracker ETF.'))
    expect(await screen.findByRole('table', { name: 'Legs · v2' })).toBeInTheDocument()
  })

  it('an invalid quantity is refused by the engine with its reason; Save stays disabled; a valid one saves with mod+S', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^INTC/ }).focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · INTC' })
    const quantity = within(detail).getByRole('textbox', { name: 'Quantity sh' })
    const user = userEvent.setup()
    await user.clear(quantity)
    await user.type(quantity, '0{Enter}')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent('INTC: the quantity must be a positive whole number of shares.')
    expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeDisabled()
    await user.clear(quantity)
    await user.type(quantity, '6000{Enter}')
    await waitFor(() => expect(within(bar).queryByRole('alert')).toBeNull())
    await waitFor(() => expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeEnabled())
    await user.keyboard('{Control>}s{/Control}')
    await waitFor(() => expect(store().proposals[0]!.versions).toHaveLength(2))
    expect(store().proposals[0]!.versions[1]!.edits).toEqual([{ kind: 'quantity', symbol: 'INTC', quantity: 6000 }])
  })

  it('unchecking every lot is refused; choosing the short-term SPY lot is a specific-identification edit', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^SPY/ }).focus())
    await userEvent.keyboard('{Enter}')
    const detail = await screen.findByRole('region', { name: 'Leg · SPY' })
    const user = userEvent.setup()
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-0/ }))
    const bar = screen.getByRole('group', { name: 'Draft version' })
    expect(await within(bar).findByRole('alert')).toHaveTextContent('SPY: choose at least one lot.')
    await user.click(within(detail).getByRole('checkbox', { name: /^lot-pos-020-1/ }))
    await waitFor(() => expect(within(bar).queryByRole('alert')).toBeNull())
    await user.click(within(bar).getByRole('button', { name: 'Save as v2' }))
    await waitFor(() => expect(feed()).toHaveTextContent('v2 · Workbench edits: chose specific lots for SPY.'))
  })

  it('Discard returns to the latest version', async () => {
    const legs = await openWorkbench()
    act(() => within(legs).getByRole('row', { name: /^GLD/ }).focus())
    await userEvent.keyboard('x')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    await userEvent.setup().click(within(bar).getByRole('button', { name: 'Discard' }))
    expect(await screen.findByRole('table', { name: 'Legs · v1' })).toBeInTheDocument()
    expect(bar).toHaveTextContent('Showing v1')
  })

  it('states that an approval applies to an older version', async () => {
    const created = await createProposal('user-001', 'th-johnson-review', 'acc-002')
    await approveProposal('user-001', created.id, 1, created.versions[0]!.fingerprint)
    renderRoutes(routes, '/proposals/prop-0001')
    const legs = await screen.findByRole('table', { name: 'Legs · v1' })
    act(() => within(legs).getByRole('row', { name: /^GLD/ }).focus())
    await userEvent.keyboard('x')
    const bar = screen.getByRole('group', { name: 'Draft version' })
    await waitFor(() => expect(within(bar).getByRole('button', { name: 'Save as v2' })).toBeEnabled())
    await userEvent.setup().click(within(bar).getByRole('button', { name: 'Save as v2' }))
    expect(await screen.findByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
  })

  it('compliance reads the workbench but cannot edit it', async () => {
    await createProposal('user-001', 'th-johnson-review', 'acc-002')
    viewAsOnLoad('cco-001')
    renderRoutes(routes, '/proposals/prop-0001')
    const legs = await screen.findByRole('table', { name: 'Legs · v1' })
    expect(screen.getByText('You can read this proposal but not change it.')).toBeInTheDocument()
    act(() => within(legs).getByRole('row', { name: /^QAI/ }).focus())
    await userEvent.keyboard('x')
    expect(screen.queryByRole('table', { name: 'Legs · draft' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/edit-draft.test.ts src/workspace/__tests__/workbench-edit.test.tsx`
Expected: FAIL.

- [ ] **Step 3: The reducer**

```ts
// src/workspace/workbench/edit-draft.ts
import type { LegEdit } from '@/types/workspace-proposal'

export type DraftState = { base: number; edits: LegEdit[] }
export type DraftAction =
  | { type: 'toggle_exclude'; symbol: string }
  | { type: 'set_quantity'; symbol: string; quantity: number | undefined }
  | { type: 'set_lots'; symbol: string; lotIds: string[] }
  | { type: 'reset'; base: number; edits: LegEdit[] }

const KIND_ORDER: Readonly<Record<LegEdit['kind'], number>> = { exclude: 0, quantity: 1, lots: 2 }

export const normaliseDraftEdits = (edits: readonly LegEdit[]): LegEdit[] =>
  [...edits].sort((a, b) => a.symbol.localeCompare(b.symbol) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])

export const sameEdits = (a: readonly LegEdit[], b: readonly LegEdit[]) =>
  JSON.stringify(normaliseDraftEdits(a)) === JSON.stringify(normaliseDraftEdits(b))

export const isExcluded = (edits: readonly LegEdit[], symbol: string) => edits.some((e) => e.kind === 'exclude' && e.symbol === symbol)

export function quantityOf(edits: readonly LegEdit[], symbol: string): number | undefined {
  const edit = edits.find((e) => e.kind === 'quantity' && e.symbol === symbol)
  return edit?.kind === 'quantity' ? edit.quantity : undefined
}

export function lotsOf(edits: readonly LegEdit[], symbol: string): string[] | undefined {
  const edit = edits.find((e) => e.kind === 'lots' && e.symbol === symbol)
  return edit?.kind === 'lots' ? edit.lotIds : undefined
}

const without = (edits: readonly LegEdit[], kind: LegEdit['kind'], symbol: string) => edits.filter((e) => !(e.kind === kind && e.symbol === symbol))

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'toggle_exclude':
      return isExcluded(state.edits, action.symbol)
        ? { ...state, edits: without(state.edits, 'exclude', action.symbol) }
        : { ...state, edits: [...state.edits, { kind: 'exclude', symbol: action.symbol }] }
    case 'set_quantity': {
      const rest = without(state.edits, 'quantity', action.symbol)
      return { ...state, edits: action.quantity === undefined ? rest : [...rest, { kind: 'quantity', symbol: action.symbol, quantity: action.quantity }] }
    }
    case 'set_lots':
      return { ...state, edits: [...without(state.edits, 'lots', action.symbol), { kind: 'lots', symbol: action.symbol, lotIds: action.lotIds }] }
    case 'reset':
      return { base: action.base, edits: action.edits }
  }
}
```

- [ ] **Step 4: The draft hook and the save shortcut**

```ts
// src/workspace/workbench/use-draft-version.ts
import { useEffect, useMemo, useReducer, useState } from 'react'
import { useProposalPreview, useSaveVersion } from '@/hooks/use-workspace'
import type { DraftPreview, LegEdit, ProposalDetail } from '@/types/workspace-proposal'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { draftReducer, normaliseDraftEdits, sameEdits, type DraftAction } from './edit-draft'

export type DraftVersion = {
  edits: LegEdit[]; dispatch: (a: DraftAction) => void; dirty: boolean; view: DraftPreview
  previewPending: boolean; previewError: Error | null; newerArrived: boolean
  canSave: boolean; save: () => void; saving: boolean; saveError: Error | null; savedVersion?: number; discard: () => void; nextVersion: number
}

export function useDraftVersion(detail: ProposalDetail): DraftVersion {
  const latest = latestVersionOf(detail)
  const [state, dispatch] = useReducer(draftReducer, { base: latest.n, edits: latest.edits })
  const [savedVersion, setSavedVersion] = useState<number>()
  const baseEdits = detail.versions.find((v) => v.n === state.base)?.edits ?? []
  const clean = sameEdits(state.edits, baseEdits)
  // A version that lands while the draft is clean becomes the draft.
  useEffect(() => {
    if (clean && state.base !== latest.n) dispatch({ type: 'reset', base: latest.n, edits: latest.edits })
  }, [clean, state.base, latest.n, latest.edits])
  const dirty = !sameEdits(state.edits, latest.edits)
  const edits = useMemo(() => normaliseDraftEdits(state.edits), [state.edits])
  const preview = useProposalPreview(detail.id, edits, dirty)
  const saveVersion = useSaveVersion(detail.id)
  const previewReady = dirty && preview.data !== undefined && !preview.isPlaceholderData && !preview.isError
  const canSave = previewReady && !saveVersion.isPending
  const save = () => {
    if (!canSave) return
    setSavedVersion(undefined)
    saveVersion.mutate(edits, {
      onSuccess: (saved) => {
        const v = saved.versions[saved.versions.length - 1]
        if (!v) return
        setSavedVersion(v.n)
        dispatch({ type: 'reset', base: v.n, edits: v.edits })
      },
    })
  }
  return {
    edits: state.edits,
    dispatch: (a) => { setSavedVersion(undefined); dispatch(a) },
    dirty,
    view: dirty && preview.data ? preview.data : latest,
    previewPending: dirty && preview.isFetching,
    previewError: dirty ? preview.error : null,
    newerArrived: dirty && state.base !== latest.n,
    canSave,
    save,
    saving: saveVersion.isPending,
    saveError: saveVersion.error,
    savedVersion,
    discard: () => { setSavedVersion(undefined); dispatch({ type: 'reset', base: latest.n, edits: latest.edits }) },
    nextVersion: latest.n + 1,
  }
}
```

```ts
// src/workspace/workbench/use-save-shortcut.ts
import { useEffect, useRef } from 'react'

/** ⌘S / Ctrl+S saves the draft from anywhere on the page, inputs included, and never opens the browser's save dialog here. */
export function useSaveShortcut(onSave: () => void, enabled: boolean): void {
  const latest = useRef(onSave)
  latest.current = onSave
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== 's') return
      e.preventDefault()
      latest.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
```

- [ ] **Step 5: The draft bar and the wiring**

```tsx
// src/workspace/workbench/DraftBar.tsx
import { Button } from '@/kit/button/Button'
import type { DraftVersion } from './use-draft-version'

export function DraftBar({ draft, latestVersion }: { draft: DraftVersion; latestVersion: number }) {
  return (
    <div role="group" aria-label="Draft version" className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-ink p-3">
      <span className="text-label uppercase text-ink">{draft.dirty ? 'Draft · not saved' : `Showing v${latestVersion}`}</span>
      <Button disabled={!draft.canSave} onClick={draft.save}>{`Save as v${draft.nextVersion}`}</Button>
      <Button rank="secondary" disabled={!draft.dirty || draft.saving} onClick={draft.discard}>Discard</Button>
      {draft.previewPending && !draft.previewError ? <p role="status" className="text-body text-ink-3">Updating the preview…</p> : null}
      {draft.newerArrived ? <p role="status" className="text-body text-ink-2">{`v${latestVersion} arrived while you were editing; your edits will apply on top of it.`}</p> : null}
      {draft.savedVersion !== undefined ? <p role="status" className="text-body text-ink-2">{`Saved as v${draft.savedVersion} · posted to the thread.`}</p> : null}
      {draft.previewError ? <p role="alert" className="text-body">{draft.previewError.message}</p> : null}
      {draft.saveError ? <p role="alert" className="text-body">{draft.saveError.message}</p> : null}
    </div>
  )
}
```

`Workbench.tsx` becomes:

```tsx
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { fmtTimestamp } from '@/kit/measure'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useThread } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { authorName } from '@/workspace/proposal/author-name'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { canPostIn } from '@/workspace/thread/can-post'
import type { Directory } from '@/types/workspace'
import type { ProposalDetail } from '@/types/workspace-proposal'
import { DraftBar } from './DraftBar'
import { LegDetail } from './LegDetail'
import { WorkbenchLegs } from './WorkbenchLegs'
import { WorkbenchSummary } from './WorkbenchSummary'
import { isExcluded, lotsOf, quantityOf } from './edit-draft'
import { useDraftVersion } from './use-draft-version'
import { useSaveShortcut } from './use-save-shortcut'

export function Workbench({ detail, directory }: { detail: ProposalDetail; directory: Directory }) {
  const [params] = useSearchParams()
  const { viewerId } = useViewer()
  const thread = useThread(detail.threadId)
  const draft = useDraftVersion(detail)
  const [expanded, setExpanded] = useState<string>()
  const canEdit = thread.data !== undefined && canPostIn(thread.data.thread, viewerId, directory)
  useSaveShortcut(draft.save, canEdit)
  const from = params.get('from') ?? detail.threadId
  const latest = latestVersionOf(detail)
  const view = draft.view
  const caption = draft.dirty ? 'Legs · draft' : `Legs · v${latest.n}`
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link to={`/t/${encodeURIComponent(from)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Back to the thread</Link>
        <span className="text-label uppercase text-ink-3">Proposal</span>
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{detail.title}</h1>
        <p className="tabular text-label text-ink-3">{`v${latest.n} latest · ${authorName(latest.author, directory)} · ${fmtTimestamp(latest.createdAt)} · fingerprint ${latest.fingerprint}`}</p>
        <ApprovalNote state={detail.approval} />
        <p className="text-body text-ink-2">The workbench never approves. Approval is a recorded act in the thread.</p>
      </header>
      {canEdit ? <DraftBar draft={draft} latestVersion={latest.n} /> : <p className="text-body text-ink-3">You can read this proposal but not change it.</p>}
      <Pane title="Legs" meta={draft.dirty ? 'draft' : `v${latest.n}`}>
        <WorkbenchLegs view={view} caption={caption}
          onExpand={(s) => setExpanded((open) => (open === s ? undefined : s))}
          onToggleExclude={canEdit ? (symbol) => draft.dispatch({ type: 'toggle_exclude', symbol }) : undefined} />
        {expanded ? (
          <LegDetail accountId={detail.accountId} view={view} symbol={expanded}
            excluded={isExcluded(draft.edits, expanded)} quantity={quantityOf(draft.edits, expanded)} lotIds={lotsOf(draft.edits, expanded)}
            onToggleExclude={canEdit ? () => draft.dispatch({ type: 'toggle_exclude', symbol: expanded }) : undefined}
            onQuantity={canEdit ? (quantity) => draft.dispatch({ type: 'set_quantity', symbol: expanded, quantity }) : undefined}
            onLots={canEdit ? (lotIds) => draft.dispatch({ type: 'set_lots', symbol: expanded, lotIds }) : undefined} />
        ) : null}
      </Pane>
      <WorkbenchSummary detail={detail} view={view} />
    </div>
  )
}
```

The hooks (`useSearchParams`, `useViewer`, `useThread`, `useDraftVersion`, `useState`, `useSaveShortcut`) all run before the `latest` guard.

- [ ] **Step 6: Run the tests**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/ src/__tests__/guardrails/`
Expected: PASS. If a test that waits for the preview flakes under load, it is CPU contention (see Global Constraints), not the hook; rerun alone before debugging.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/workspace/workbench src/workspace/__tests__/edit-draft.test.ts src/workspace/__tests__/workbench-edit.test.tsx
git commit -m "feat(workspace): edit a draft version in the workbench — live engine preview, save as a version, keyboard"
```

### Task 15: Approve in the context column

**Files:**
- Create: `src/workspace/context/ApprovalPanel.tsx`, `src/workspace/context/approve-blocker.ts`
- Modify: `src/workspace/context/ContextColumn.tsx`
- Test: `src/workspace/__tests__/approve-blocker.test.ts`, `src/workspace/__tests__/approval.test.tsx`

**Interfaces:**
- Consumes: Task 9 `useProposals`, `useApproveProposal`, `useWithdrawApproval`; Task 10 `ApprovalNote`, `isApprovedLatest`, `SIDE_WORDS`, `latestVersionOf`; kit `Attestation`, `Button`, `StatusCode`, `Tag`; Phase 2 `ContextSection`, act-slip focus (`onSent` / `actAnchorId`).
- Produces:

```ts
// src/workspace/context/approve-blocker.ts
export function approveBlocker(facts: { blocked: boolean; hasLegs: boolean; attested: boolean }): string | undefined
// component
ApprovalPanel({ thread: Thread; directory: Directory; onRecorded: (actId: string) => void })
```

For the advisor only: **Approve v{n}** for the latest version, behind an attestation, disabled with the reason when the pre-trade check blocks. The act's RecordSlip appears under "Binding acts" (Phase 2's `ActsPanel`) and focus moves to it; the staged orders read "pending compliance review". The approver may withdraw. Everyone else who can see the thread (Sarah, Mike, Mark) sees the approval state and the staged orders, and no button.

- [ ] **Step 1: Write the failing tests**

```ts
// src/workspace/__tests__/approve-blocker.test.ts
import { it, expect } from 'vitest'
import { approveBlocker } from '@/workspace/context/approve-blocker'

it('names the first thing standing between the advisor and the approval', () => {
  expect(approveBlocker({ blocked: true, hasLegs: true, attested: true })).toBe('The pre-trade check blocks this version, so it cannot be approved.')
  expect(approveBlocker({ blocked: false, hasLegs: false, attested: true })).toBe('This version has no legs to approve.')
  expect(approveBlocker({ blocked: false, hasLegs: true, attested: false })).toBe('Confirm your review above to approve.')
  expect(approveBlocker({ blocked: false, hasLegs: true, attested: true })).toBeUndefined()
})
```

```tsx
// src/workspace/__tests__/approval.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, reviseProposal, saveProposalVersion } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))

async function openApproval() {
  renderRoutes(routes, '/t/th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return inContext().findByRole('region', { name: 'Approval · Johnson rebalance' })
}

describe('approving a proposal', () => {
  it('the advisor attests and approves v1 once, even on a double click; orders are staged pending compliance review', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const panel = await openApproval()
    const approve = within(panel).getByRole('button', { name: 'Approve v1' })
    expect(approve).toBeDisabled()
    expect(approve).toHaveAccessibleDescription('Confirm your review above to approve.')
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade reading.' }))
    await user.dblClick(within(panel).getByRole('button', { name: 'Approve v1' }))
    const slip = await inContext().findByRole('article', { name: 'Approved v1 of the Johnson rebalance' })
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0001')))
    expect(slip).toHaveTextContent('Adrian Hale, Advisor')
    expect(store().acts).toHaveLength(1)
    const staged = await within(panel).findByRole('list', { name: 'Staged orders' })
    expect(within(panel).getByText('PENDING COMPLIANCE REVIEW')).toBeInTheDocument()
    expect(staged).toHaveTextContent('Sell 7,000 INTC')
    expect(within(panel).getByText('v1 is approved')).toBeInTheDocument()
    expect(within(panel).queryByRole('alert')).toBeNull()
  })

  it('a version the pre-trade check blocks cannot be approved, and says why', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await saveProposalVersion(ADRIAN, 'prop-0001', [{ kind: 'quantity', symbol: 'VWO', quantity: 100_000 }])
    const panel = await openApproval()
    await userEvent.setup().click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v2 and its pre-trade reading.' }))
    const approve = within(panel).getByRole('button', { name: 'Approve v2' })
    expect(approve).toBeDisabled()
    expect(approve).toHaveAccessibleDescription('The pre-trade check blocks this version, so it cannot be approved.')
    expect(within(panel).getAllByText('BLOCK').length).toBeGreaterThan(0)
  })

  it('a newer version leaves the approval on v1; approving v2 withdraws it in the same act', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint)
    await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    const panel = await openApproval()
    expect(within(panel).getByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v2 and its pre-trade reading.' }))
    await user.click(within(panel).getByRole('button', { name: 'Approve v2' }))
    expect(await inContext().findByRole('article', { name: 'Approved v2 of the Johnson rebalance; the approval of v1 is withdrawn' })).toBeInTheDocument()
  })

  it('a version that arrives after the panel rendered does not move the approval: v1 is approved and v2 is reported unapproved', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const panel = await openApproval()
    await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('checkbox', { name: 'I reviewed every leg of v1 and its pre-trade reading.' }))
    await user.click(within(panel).getByRole('button', { name: 'Approve v1' }))
    expect(await within(panel).findByText('Approval applies to v1; v2 is unapproved')).toBeInTheDocument()
    expect(store().approvals.map((a) => [a.version, a.status])).toEqual([[1, 'active']])
  })

  it('the approver withdraws; the staging goes with it', async () => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint)
    const panel = await openApproval()
    await userEvent.setup().click(within(panel).getByRole('button', { name: 'Withdraw the approval of v1' }))
    expect(await inContext().findByRole('article', { name: 'Withdrew the approval of v1 of the Johnson rebalance' })).toBeInTheDocument()
    await waitFor(() => expect(within(panel).queryByRole('list', { name: 'Staged orders' })).toBeNull())
    expect(within(panel).getByText('v1 is not approved')).toBeInTheDocument()
  })

  it.each(['cco-001', 'user-002', 'user-003'])('%s sees the approval and the staged orders, and no button', async (viewer) => {
    const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint)
    viewAsOnLoad(viewer)
    const panel = await openApproval()
    expect(within(panel).getByText('PENDING COMPLIANCE REVIEW')).toBeInTheDocument()
    expect(within(panel).queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/approve-blocker.test.ts src/workspace/__tests__/approval.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/workspace/context/approve-blocker.ts
/** Why the Approve button is disabled, if it is: the engine refuses the same cases again on the request. */
export function approveBlocker({ blocked, hasLegs, attested }: { blocked: boolean; hasLegs: boolean; attested: boolean }): string | undefined {
  if (blocked) return 'The pre-trade check blocks this version, so it cannot be approved.'
  if (!hasLegs) return 'This version has no legs to approve.'
  if (!attested) return 'Confirm your review above to approve.'
  return undefined
}
```

```tsx
// src/workspace/context/ApprovalPanel.tsx
import { useId, useRef, useState } from 'react'
import { Attestation } from '@/kit/attestation/Attestation'
import { Button } from '@/kit/button/Button'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { fmtMoney, fmtQuantity } from '@/kit/measure'
import { useApproveProposal, useProposals, useWithdrawApproval } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ApprovalNote } from '@/workspace/proposal/ApprovalNote'
import { isApprovedLatest } from '@/workspace/proposal/approval-words'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { SIDE_WORDS } from '@/workspace/proposal/leg-status'
import type { Directory, Thread } from '@/types/workspace'
import type { ProposalDetail, StagedOrder } from '@/types/workspace-proposal'
import { ContextSection } from './ContextSection'
import { approveBlocker } from './approve-blocker'

type ApprovalPanelProps = { thread: Thread; directory: Directory; onRecorded: (actId: string) => void }

export function ApprovalPanel({ thread, directory, onRecorded }: ApprovalPanelProps) {
  const proposals = useProposals(thread.id)
  if (proposals.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the proposals…</p>
  if (proposals.isError) return <p role="alert" className="py-5 text-body">{proposals.error.message}</p>
  return proposals.data.map((p) => <ProposalApproval key={p.id} detail={p} directory={directory} onRecorded={onRecorded} />)
}

function ProposalApproval({ detail, directory, onRecorded }: { detail: ProposalDetail; directory: Directory; onRecorded: (actId: string) => void }) {
  const { viewerId } = useViewer()
  const approve = useApproveProposal()
  const withdraw = useWithdrawApproval()
  const [attested, setAttested] = useState(false)
  const busy = useRef(false)
  const attestId = useId()
  const reasonId = useId()
  const latest = latestVersionOf(detail)
  const permissions = directory.permissions[viewerId] ?? []
  const canApprove = permissions.includes('approve_proposal') && !isApprovedLatest(detail.approval)
  const reason = approveBlocker({ blocked: latest.pretrade.violations.some((v) => v.severity === 'block'), hasLegs: latest.preview.trades.length > 0, attested })
  const approval = detail.approval
  const canWithdraw = approval.kind === 'approved' && approval.approverId === viewerId && permissions.includes('withdraw_approval')
  const pending = detail.staged.filter((o) => o.status === 'pending_compliance')

  // A ref, not render state, so a second click in the same frame cannot send a second approval.
  const record = (send: (done: { onSuccess: (act: { id: string }) => void; onSettled: () => void }) => void) => {
    if (busy.current) return
    busy.current = true
    send({ onSuccess: (act) => { setAttested(false); onRecorded(act.id) }, onSettled: () => { busy.current = false } })
  }

  return (
    <ContextSection title={`Approval · ${detail.title}`}>
      <ApprovalNote state={approval} />
      {canApprove ? (
        <div className="flex flex-col items-start gap-3">
          <Attestation id={attestId} checked={attested} onChange={setAttested}>{`I reviewed every leg of v${latest.n} and its pre-trade reading.`}</Attestation>
          <Button disabled={reason !== undefined || approve.isPending} aria-describedby={reason ? reasonId : undefined}
            onClick={() => record((done) => approve.mutate({ proposalId: detail.id, version: latest.n, fingerprint: latest.fingerprint }, done))}>
            {`Approve v${latest.n}`}
          </Button>
          {reason ? <p id={reasonId} className="text-body text-ink-2">{reason}</p> : null}
          {latest.pretrade.violations.filter((v) => v.severity === 'block').map((v) => (
            <p key={`${v.category}:${v.symbol ?? v.constraint}`} className="flex items-baseline gap-3 text-body"><StatusCode status="BLOCK" /><span>{v.message}</span></p>
          ))}
        </div>
      ) : null}
      {approve.isError ? <p role="alert" className="text-body">{approve.error.message}</p> : null}
      {pending.length > 0 ? <StagedOrders orders={pending} /> : null}
      {canWithdraw ? (
        <Button rank="secondary" disabled={withdraw.isPending} onClick={() => record((done) => withdraw.mutate(detail.id, done))}>
          {`Withdraw the approval of v${approval.version}`}
        </Button>
      ) : null}
      {withdraw.isError ? <p role="alert" className="text-body">{withdraw.error.message}</p> : null}
    </ContextSection>
  )
}

function StagedOrders({ orders }: { orders: StagedOrder[] }) {
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-3">
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone="hatch">PENDING COMPLIANCE REVIEW</Tag>
        <span className="text-ink-2">Staged, not released.</span>
      </p>
      <ul aria-label="Staged orders" className="flex flex-col gap-1 text-body">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>{`${SIDE_WORDS[o.side]} ${fmtQuantity(o.quantity)} ${o.symbol}`}</span>
            <span className="tabular text-ink-2">{fmtMoney(o.estimatedValue)} <span className="text-ink-3">{o.currency}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

In `ContextColumn.tsx`, after `WhoCanSee`, render `{t.visibility !== 'client' && !viewerIsClient ? <ApprovalPanel thread={t} directory={dir} onRecorded={setSentActId} /> : null}` (the existing `sentActId` effect moves focus to the act slip once it is on screen).

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/ src/__tests__/guardrails/`
Expected: PASS.

- [ ] **Step 5: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/workspace/context/ApprovalPanel.tsx src/workspace/context/approve-blocker.ts src/workspace/context/ContextColumn.tsx src/workspace/__tests__/approve-blocker.test.ts src/workspace/__tests__/approval.test.tsx
git commit -m "feat(workspace): approve one exact version from the context column; staged orders pending compliance review"
```

### Task 16: The client letter and sending it

**Files:**
- Create: `src/workspace/context/LetterControl.tsx`, `src/workspace/context/draft-origin.ts`
- Modify: `src/workspace/context/DraftsPanel.tsx`
- Test: `src/workspace/__tests__/draft-origin.test.ts`, `src/workspace/__tests__/letter.test.tsx`

**Interfaces:**
- Consumes: Task 9 `useProposals`, `useDraftLetter`, `useReviseDraft`, `useDrafts`, `useSendToClient`; kit `TextInput`, `Tag`, `Button`.
- Produces:

```ts
// src/workspace/context/draft-origin.ts
export function draftOrigin(draft: Draft, directory: Directory): string
// components
LetterControl({ thread: Thread })
```

In Robert's thread, for a firm viewer who may draft: **Ask Client Letter Agent** drafts from the approved version into the drafts panel (firm only). The draft says where it came from; Adrian can edit it (the edit replaces the draft and keeps its basis) and send it. A stale draft carries a STALE tag and its reason, and its Send button is disabled.

- [ ] **Step 1: Write the failing tests**

```ts
// src/workspace/__tests__/draft-origin.test.ts
import { it, expect } from 'vitest'
import { draftOrigin } from '@/workspace/context/draft-origin'
import type { Directory, Draft } from '@/types/workspace'

const directory: Directory = {
  people: [{ id: 'user-001', name: 'Adrian Hale', role: 'advisor' }],
  agents: [{ id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft'], mayNot: ['send', 'post in a client thread'] } }],
  permissions: {},
}
const draft = (extra: Partial<Draft>): Draft => ({ id: 'draft-0001', clientThreadId: 'th-robert', authorId: 'user-001', body: 'x', createdAt: 'x', ...extra })

it('says who drafted a draft, from which version, and who edited it', () => {
  expect(draftOrigin(draft({}), directory)).toBe('Drafted by Adrian Hale')
  expect(draftOrigin(draft({ agentId: 'client-letter', basis: { proposalId: 'prop-0001', version: 3, fingerprint: 'ABCD1234' } }), directory))
    .toBe("Drafted by Client Letter Agent at Adrian Hale's request · from v3 · fingerprint ABCD1234")
  expect(draftOrigin(draft({ agentId: 'client-letter', supersedes: 'draft-0001', basis: { proposalId: 'prop-0001', version: 3, fingerprint: 'ABCD1234' } }), directory))
    .toBe("Client Letter Agent's draft, edited by Adrian Hale · from v3 · fingerprint ABCD1234")
})
```

```tsx
// src/workspace/__tests__/letter.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, draftLetter, reviseProposal } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'

const ADRIAN = 'user-001'
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const conversation = () => screen.getByRole('list', { name: 'Messages' })

async function approvedV1() {
  const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint)
  return created
}

async function openRobert() {
  renderRoutes(routes, '/t/th-robert')
  await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })
  return inContext().findByRole('region', { name: 'Drafts for Robert' })
}

async function viewAs(option: string) {
  const user = userEvent.setup()
  await screen.findByRole('option', { name: option })
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), option)
}

describe('the client letter', () => {
  it('drafts once from the approved version; Adrian edits and sends; Robert sees only the message', async () => {
    await approvedV1()
    const drafts = await openRobert()
    const user = userEvent.setup()
    await user.dblClick(within(drafts).getByRole('button', { name: 'Ask Client Letter Agent' }))
    const draft = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('Dear Robert,')
    expect(draft).toHaveTextContent('realises a loss of $45,850')
    expect(draft).toHaveTextContent('State tax is not modelled.')
    expect(draft).toHaveTextContent("Drafted by Client Letter Agent at Adrian Hale's request · from v1")
    expect(store().drafts).toHaveLength(1)

    await user.click(within(draft).getByRole('button', { name: 'Edit' }))
    const editor = within(draft).getByRole('textbox', { name: 'Edit the letter' })
    await user.type(editor, '{End}{Enter}{Enter}I will call you on Friday to walk through it.')
    await user.click(within(draft).getByRole('button', { name: 'Save edit' }))
    const edited = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    await waitFor(() => expect(edited).toHaveTextContent("Client Letter Agent's draft, edited by Adrian Hale"))
    await user.click(within(edited).getByRole('button', { name: 'Send to Robert' }))
    await waitFor(() => expect(conversation()).toHaveTextContent('I will call you on Friday to walk through it.'))
    expect(conversation()).toHaveTextContent(RATE_DISCLOSURE)

    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument())
    expect(conversation()).toHaveTextContent('Dear Robert,')
    expect(document.body).not.toHaveTextContent('Client Letter Agent')
    expect(document.body).not.toHaveTextContent('Draft · not sent')
    expect(document.body).not.toHaveTextContent('Johnson Rebalance Review')
  })

  it('a letter from a version that is no longer approved is marked stale and cannot be sent', async () => {
    const created = await approvedV1()
    await draftLetter(ADRIAN, 'th-robert', created.id)
    const v2 = await reviseProposal(ADRIAN, created.id, [{ kind: 'harvest_only' }])
    await approveProposal(ADRIAN, created.id, 2, v2.versions[1]!.fingerprint)
    const drafts = await openRobert()
    const draft = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    expect(within(draft).getByText('STALE')).toBeInTheDocument()
    expect(draft).toHaveTextContent('v1 is no longer the approved version. Ask the Client Letter Agent for a new letter.')
    expect(within(draft).getByRole('button', { name: 'Send to Robert' })).toBeDisabled()
  })

  it('offers no letter until a proposal for this client is approved', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const drafts = await openRobert()
    expect(within(drafts).queryByRole('button', { name: 'Ask Client Letter Agent' })).toBeNull()
    expect(drafts).toHaveTextContent('The Client Letter Agent drafts from an approved proposal; none is approved yet.')
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/draft-origin.test.ts src/workspace/__tests__/letter.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/workspace/context/draft-origin.ts
import type { Directory, Draft } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

export function draftOrigin(draft: Draft, directory: Directory): string {
  const author = personIn(directory, draft.authorId).name
  const agent = draft.agentId ? directory.agents.find((a) => a.id === draft.agentId)?.name : undefined
  const who = !agent ? `Drafted by ${author}` : draft.supersedes ? `${agent}'s draft, edited by ${author}` : `Drafted by ${agent} at ${author}'s request`
  return draft.basis ? `${who} · from v${draft.basis.version} · fingerprint ${draft.basis.fingerprint}` : who
}
```

```tsx
// src/workspace/context/LetterControl.tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useDraftLetter, useProposals } from '@/hooks/use-workspace'
import type { Thread } from '@/types/workspace'

/** Asks the Client Letter Agent for a letter from this client's approved proposal. */
export function LetterControl({ thread }: { thread: Thread }) {
  const proposals = useProposals()
  const letter = useDraftLetter(thread.id)
  const [report, setReport] = useState<string>()
  if (proposals.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposals…</p>
  if (proposals.isError) return <p role="alert" className="text-body">{proposals.error.message}</p>
  const approved = proposals.data.flatMap((p) => (p.clientId === thread.clientId && p.approval.kind === 'approved' ? [{ p, version: p.approval.version }] : []))
  if (approved.length === 0) return <p className="text-body text-ink-3">The Client Letter Agent drafts from an approved proposal; none is approved yet.</p>
  return (
    <div className="flex flex-col items-start gap-2">
      {approved.map(({ p, version }) => (
        <div key={p.id} className="flex flex-col items-start gap-1">
          <Button rank="secondary" disabled={letter.isPending}
            onClick={() => letter.mutate(p.id, { onSuccess: () => setReport(`The Client Letter Agent drafted a letter from v${version} of the ${p.title}.`) })}>
            Ask Client Letter Agent
          </Button>
          <span className="text-label text-ink-3">{`From v${version} of the ${p.title}, approved`}</span>
        </div>
      ))}
      {letter.isError ? <p role="alert" className="text-body">{letter.error.message}</p> : null}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
    </div>
  )
}
```

`DraftsPanel.tsx`:
- It always renders its section for a viewer who may draft (`directory.permissions[viewerId]` includes `'draft_for_client'`), with `<LetterControl thread={thread} />` first; for other firm viewers it renders only when there are drafts (as before).
- `DraftView` takes `threadId` and `canEdit` and becomes:

```tsx
function DraftView({ draft, directory, threadId, canEdit, sendLabel, sending, onSend }: DraftViewProps) {
  const titleId = useId()
  const reasonId = useId()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(draft.body)
  const revise = useReviseDraft(threadId)
  const stale = draft.stale === true
  const save = () => revise.mutate({ draftId: draft.id, body: text }, { onSuccess: () => setEditing(false) })
  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-3 border border-ink p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={titleId} className="text-label uppercase text-ink">Draft · not sent</h3>
        <span className="tabular text-label text-ink-3">{fmtTimestamp(draft.createdAt)}</span>
      </div>
      {stale ? (
        <p id={reasonId} className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone="solid">STALE</Tag>
          <span>{`v${draft.basis?.version ?? ''} is no longer the approved version. Ask the Client Letter Agent for a new letter.`}</span>
        </p>
      ) : null}
      {editing ? (
        <div className="flex flex-col gap-2">
          <TextInput label="Edit the letter" value={text} rows={14} onChange={setText} />
          <div className="flex gap-3">
            <Button onClick={save} disabled={revise.isPending || text.trim() === ''}>Save edit</Button>
            <Button rank="secondary" onClick={() => { setText(draft.body); setEditing(false) }}>Cancel</Button>
          </div>
          {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
        </div>
      ) : <p className="whitespace-pre-line text-copy">{draft.body}</p>}
      <p className="text-label text-ink-3">{draftOrigin(draft, directory)}</p>
      <div className="flex flex-col items-start gap-3 border-t border-rule pt-3">
        <p className="text-body text-ink-2">
          {sendLabel ? 'Sending is recorded as a binding act by you.' : 'Only the advisor of record can send this. Sending is recorded as a binding act.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {canEdit && !editing ? <Button rank="secondary" onClick={() => { setText(draft.body); setEditing(true) }}>Edit</Button> : null}
          {sendLabel ? <Button disabled={sending || stale || editing} aria-describedby={stale ? reasonId : undefined} onClick={onSend}>{sendLabel}</Button> : null}
        </div>
      </div>
    </article>
  )
}
```

(`canEdit` is the same draft permission; `DraftsPanel` passes `threadId={thread.id}`. The phrase "Drafted by …" previously rendered as its own line is replaced by `draftOrigin`; update the Phase 2 context test only if it asserted that exact line.)

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run src/workspace/__tests__/ src/__tests__/guardrails/`
Expected: PASS, including the Phase 2 send-to-client flow in `context.test.tsx`.

- [ ] **Step 5: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/workspace/context src/workspace/__tests__/draft-origin.test.ts src/workspace/__tests__/letter.test.tsx
git commit -m "feat(workspace): the Client Letter Agent drafts Robert's letter from the approved version; edit, stale guard, send"
```

### Task 17: Carry-overs — NBA action routes and nba-002's score from the engine

Independent of every other task (only `src/mocks/data/nbas.ts` and its tests); may run in parallel with any of them.

**Files:**
- Modify: `src/mocks/data/nbas.ts`
- Test: `src/mocks/data/__tests__/nba-routes.test.ts`, `src/mocks/data/__tests__/nba-facts.test.ts` (append)

**Interfaces:**
- Produces:

```ts
// src/mocks/data/nbas.ts
/** nba-002's impact (0–100) from the capital-gains tax the harvest saves this year, log-scaled: $100 → 0, $100,000 → 100. Carryforward is noted, not scored. */
export function harvestImpactScore(savingThisYearUsd: number): number
export function harvestPriority(impact: number): 'high' | 'medium'        // 'high' from 70
/** The composite the NBA invariants check every score against. */
export function compositeScore(s: Omit<NBAScoring, 'composite'>): number  // round(0.3u + 0.25i + 0.2e + 0.15r + 0.1c)
```

The roadmap's Phase 3 follow-ups: restore the guard that every NBA `actionRoute.path` resolves to a real workspace route (removed in Phase 1 with the old route tree), and derive nba-002's priority and impact score from the engine (this year's saving; the carryforward stays in `estimatedImpactNote`), replacing the literal `high` / `75`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/mocks/data/__tests__/nba-routes.test.ts
import { describe, it, expect } from 'vitest'
import { matchRoutes } from 'react-router-dom'
import { routes } from '@/app/routes'
import { nbas } from '@/mocks/data/nbas'
import { accounts } from '@/mocks/data/accounts'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'

const leafOf = (path: string) => {
  const matches = matchRoutes(routes, path) ?? []
  return matches[matches.length - 1]
}

describe('every NBA action route resolves to a real workspace route', () => {
  const routed = nbas.flatMap((n) => (n.actionRoute ? [[n.id, n.actionRoute.path] as const] : []))

  it('reads the route tree (a dead link falls through to not found)', () => {
    expect(leafOf('/portfolios/rebalance')?.route.path).toBe('*')
    expect(routed.length).toBeGreaterThan(15)
  })

  it.each(routed)('%s → %s', (_, path) => {
    const leaf = leafOf(path)
    expect(leaf, `${path} matches no route`).toBeDefined()
    expect(leaf?.route.path, `${path} falls through to not found`).not.toBe('*')
    const { accountId, threadId } = leaf?.params ?? {}
    if (accountId !== undefined) expect(accounts.some((a) => a.id === accountId), `${accountId} is not an account`).toBe(true)
    if (threadId !== undefined) expect(SEED_THREADS.some((t) => t.id === threadId), `${threadId} is not a thread`).toBe(true)
  })
})
```

Append to `src/mocks/data/__tests__/nba-facts.test.ts`:

```ts
import { compositeScore, harvestImpactScore, harvestPriority, intcHarvestFacts } from '@/mocks/data/nbas'

describe('nba-002 is scored from the engine', () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!
  const saving = intcHarvestFacts().totalSavingThisYear

  it('impact comes from this year\'s saving; priority and composite follow from it', () => {
    expect(saving).toBe(1_490)
    expect(harvestImpactScore(saving)).toBe(39)
    expect(nba.scoring.impact).toBe(harvestImpactScore(saving))
    expect(nba.priority).toBe(harvestPriority(nba.scoring.impact))
    expect(nba.priority).toBe('medium')
    const { composite, ...rest } = nba.scoring
    expect(composite).toBe(compositeScore(rest))
    expect(nba.estimatedImpact).toBe(saving)
    expect(nba.estimatedImpactNote).toContain('carries forward')
  })

  it('the impact scale is monotonic and bounded', () => {
    expect(harvestImpactScore(0)).toBe(0)
    expect(harvestImpactScore(100)).toBe(0)
    expect(harvestImpactScore(10_000)).toBe(67)
    expect(harvestImpactScore(100_000)).toBe(100)
    expect(harvestImpactScore(10_000_000)).toBe(100)
    expect(harvestPriority(69)).toBe('medium')
    expect(harvestPriority(70)).toBe('high')
  })
})
```

(If `nba-facts.test.ts` already imports from `@/mocks/data/nbas`, merge the import rather than adding a second line.)

- [ ] **Step 2: Run the tests to see them fail**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/nba-routes.test.ts src/mocks/data/__tests__/nba-facts.test.ts`
Expected: FAIL — old `/portfolios/…` and `/clients/…` paths fall through to `*`; the score functions do not exist.

- [ ] **Step 3: Re-point the action routes**

Each NBA's `actionRoute.path` becomes a workspace route (keep `openAI` / `aiMessage`; drop nba-007's `params`, which addressed a tab of the old account page):

| NBA | New path | Why this destination |
|---|---|---|
| nba-001 batch rebalance | `/` | there is no batch view in the workspace yet |
| nba-002 INTC harvest | `/t/th-brief` | Adrian's Brief carries the INTC harvest |
| nba-003 NVDA wash sale | `/accounts/acc-007` | Margaret Chen Individual sold the NVDA |
| nba-004 RMD | `/accounts/acc-020` | James Thompson Traditional IRA |
| nba-005 Patel education | `/accounts/acc-029` | Patel 529 |
| nba-006 Garcia retirement | `/accounts/acc-035` | Linda Garcia Traditional IRA |
| nba-007 Williams NVDA concentration | `/accounts/acc-011` | David Williams Individual |
| nba-008 Anderson duration | `/accounts/acc-022` | Richard Anderson Individual |
| nba-010 Williams review | `/accounts/acc-011` | the household's primary account |
| nba-011 Patel life event | `/accounts/acc-026` | Raj Patel Individual |
| nba-012 Johnson IPS review | `/accounts/acc-002` | Robert Johnson Individual |
| nba-013 Anderson wire | `/accounts/acc-022` | the account the wire reached |
| nba-014 Williams held-away 401(k) | `/accounts/acc-011` | David Williams Individual |
| nba-015 referral | `/` | a prospect has no workspace view yet (Phase 6) |
| nba-016 Anderson review prep | `/accounts/acc-022` | the household's primary account |
| nba-017 Thompson Roth conversion | `/accounts/acc-020` | the Traditional IRA to convert from |
| nba-018 new model | `/` | no model view yet (Phase 7) |
| nba-019 Foster funding | `/accounts/acc-037` | William Foster Individual |
| nba-020 O'Brien 529 | `/accounts/acc-032` | O'Brien 529 |

nba-009 has no action route and keeps none.

- [ ] **Step 4: Score nba-002 from the engine**

Add to `nbas.ts` (import `NBAPriority`, `NBAScoring` types from `@/types/nba`):

```ts
export function harvestImpactScore(savingThisYearUsd: number): number {
  if (savingThisYearUsd <= 100) return 0
  return Math.min(100, Math.round(((Math.log10(savingThisYearUsd) - 2) / 3) * 100))
}

export function harvestPriority(impact: number): Extract<NBAPriority, 'high' | 'medium'> {
  return impact >= 70 ? 'high' : 'medium'
}

export function compositeScore(s: Omit<NBAScoring, 'composite'>): number {
  return Math.round(0.3 * s.urgency + 0.25 * s.impact + 0.2 * s.efficiency + 0.15 * s.relationship + 0.1 * s.confidence)
}

const intcImpact = harvestImpactScore(intcHarvest.totalSavingThisYear)
const intcScoring = { urgency: 85, impact: intcImpact, efficiency: 70, relationship: 40, confidence: 92 }
```

and in the nba-002 entry replace `priority: 'high'` and the literal `scoring` with:

```ts
    // Phase 3 · priority and impact from the engine: the tax this harvest saves this year
    // (`estimatedImpact`), not a hand-set 75. Most of its value is the loss carried forward, which
    // `estimatedImpactNote` states and the score does not count.
    priority: harvestPriority(intcImpact),
    scoring: { ...intcScoring, composite: compositeScore(intcScoring) },
```

($1,490 saved this year scores 39; the composite is 64; priority `medium`. The NBA invariants — urgency ≥ 35 for medium, composite within 6 of the formula — hold.)

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/vitest run src/mocks/data/__tests__/`
Expected: PASS. If another test pinned nba-002's literal `high` or `75`, update it to the derived value and say so in the commit message.

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add src/mocks/data/nbas.ts src/mocks/data/__tests__/nba-routes.test.ts src/mocks/data/__tests__/nba-facts.test.ts
git commit -m "fix(nba): every action route resolves to a workspace route; nba-002 is scored from this year's saving"
```

### Task 18: The story end to end, and visual baselines

**Files:**
- Create: `e2e-visual/rebalance-job.spec.ts`
- Modify: `e2e-visual/__baselines__/*.png` (regenerated and reviewed)
- Test: the spec itself

**Interfaces:**
- Consumes: every accessible name fixed in Tasks 10–16 (listed in the spec below), `SCREENSHOT`, `clippedLabels`, `pageOverflowX` from `e2e-visual/layout-checks.ts`.

- [ ] **Step 1: Write the spec**

```ts
// e2e-visual/rebalance-job.spec.ts
import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'

type Theme = 'light' | 'dark'
type Layout = 'three-panes' | 'workbench'
type Scene = { name: string; layout: Layout; open: (page: Page) => Promise<void> }

async function settle(page: Page) {
  await expect(page.getByText(/^(Loading|Updating)/)).toHaveCount(0, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
}

async function visit(page: Page, path: string, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme })
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}theme=${theme}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
}

const conversation = (page: Page) => page.getByRole('list', { name: 'Messages' })
const context = (page: Page) => page.getByRole('complementary', { name: 'Thread context' })
const threadLink = (page: Page, name: string) => page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name, exact: true })
const embedOf = (page: Page) => page.getByRole('region', { name: 'Proposal · Johnson rebalance' })

async function askProposalAgent(page: Page, theme: Theme) {
  await visit(page, '/t/th-johnson-review', theme)
  await context(page).getByRole('button', { name: 'Ask Proposal Agent' }).click()
  await expect(embedOf(page).getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
}

async function approveLatest(page: Page, version: number) {
  const approval = context(page).getByRole('region', { name: 'Approval · Johnson rebalance' })
  await approval.getByRole('checkbox', { name: `I reviewed every leg of v${version} and its pre-trade reading.` }).check()
  await approval.getByRole('button', { name: `Approve v${version}` }).click()
  await expect(context(page).getByRole('article', { name: new RegExp(`^Approved v${version} of the Johnson rebalance`) })).toBeVisible()
}

async function sendLetter(page: Page) {
  await threadLink(page, 'Robert Johnson').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Robert Johnson')
  await context(page).getByRole('button', { name: 'Ask Client Letter Agent' }).click()
  const draft = context(page).getByRole('article', { name: 'Draft · not sent' })
  await expect(draft).toContainText('Dear Robert,')
  await draft.getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation(page)).toContainText('Dear Robert,')
}

const brief = (theme: Theme) => async (page: Page) => {
  await visit(page, '/t/th-brief', theme)
  await expect(page.getByRole('region', { name: 'Ranked summary' })).toBeVisible()
  await settle(page)
}

const proposalThread = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await settle(page)
}

const workbench = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await embedOf(page).getByRole('link', { name: 'Workbench' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Johnson rebalance')
  await expect(page.getByRole('table', { name: 'Legs · v1' })).toBeVisible()
  await settle(page)
}

const robertLetter = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await approveLatest(page, 1)
  await sendLetter(page)
  await page.getByLabel('View as').selectOption({ label: 'Robert Johnson · Client' })
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await settle(page)
}

const SCENES: Scene[] = (['light', 'dark'] as const).flatMap((theme): Scene[] => [
  { name: `brief-${theme}`, layout: 'three-panes', open: brief(theme) },
  { name: `proposal-thread-${theme}`, layout: 'three-panes', open: proposalThread(theme) },
  { name: `workbench-${theme}`, layout: 'workbench', open: workbench(theme) },
  { name: `robert-letter-${theme}`, layout: 'three-panes', open: robertLetter(theme) },
])

async function boxOf(region: Locator) {
  const box = await region.boundingBox()
  if (!box) throw new Error('region is not rendered')
  return box
}

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    test('baseline at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      await expect(page).toHaveScreenshot(`${scene.name}.png`, SCREENSHOT)
    })

    test('no page-level horizontal scroll and no clipped labels at 1024px and 1440px', async ({ page }) => {
      for (const width of [1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        expect(await clippedLabels(page)).toEqual([])
      }
    })

    test('panes side by side at 1440px; the context column drops below main at 1024px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      const [main, column] = await Promise.all([boxOf(page.getByRole('main')), boxOf(page.locator('#context-column'))])
      expect(column.x).toBeGreaterThanOrEqual(main.x + main.width)
      expect(Math.abs(column.y - main.y)).toBeLessThanOrEqual(1)
      if (scene.layout === 'three-panes') {
        const threads = await boxOf(page.getByRole('navigation', { name: 'Threads' }))
        expect(main.x).toBeGreaterThanOrEqual(threads.x + threads.width)
      } else {
        await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
      }
      await page.setViewportSize({ width: 1024, height: 900 })
      const [narrowMain, narrowColumn] = await Promise.all([boxOf(page.getByRole('main')), boxOf(page.locator('#context-column'))])
      expect(narrowColumn.y).toBeGreaterThanOrEqual(narrowMain.y + narrowMain.height)
    })
  })
}

test('one presenter runs Brief → proposal → revise → workbench → approve → letter → send; each viewer sees their part', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const heading = page.getByRole('heading', { level: 1 })

  // The Brief, ready on load; both findings go to the team thread.
  await visit(page, '/t/th-brief', 'light')
  await expect(page.getByRole('region', { name: 'Ranked summary' }).getByRole('listitem').first()).toContainText('US Equity is outside its tolerance band.')
  for (const name of [/^Drift Monitor: US Equity is outside its tolerance band\.$/, /^Harvest Scanner: Intel Corp\. can be sold at a loss today/]) {
    const finding = conversation(page).getByRole('article', { name })
    await finding.getByRole('button', { name: 'Take to team thread' }).click()
    await expect(finding.getByRole('status')).toHaveText('Taken to Johnson Rebalance Review.')
  }

  // The team thread: the carried cards, then v1 from the Proposal Agent.
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(heading).toHaveText('Johnson Rebalance Review')
  await expect(conversation(page).getByRole('article', { name: /^Carried from the Brief: / })).toHaveCount(2)
  await context(page).getByRole('button', { name: 'Ask Proposal Agent' }).click()
  const embed = embedOf(page)
  await expect(embed.getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()

  // Revise under a gains cap: v2.
  await embed.getByRole('button', { name: 'Revise' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revise the proposal' })
  await dialog.getByRole('checkbox', { name: 'Cap realised gains' }).check()
  await dialog.getByRole('textbox', { name: 'Realised gains cap USD' }).fill('50000')
  await dialog.getByRole('button', { name: 'Ask Proposal Agent to revise' }).click()
  await expect(conversation(page).getByRole('article', { name: 'v2 · Proposal Agent' })).toBeVisible()
  await expect(embed.getByRole('table', { name: 'Proposal legs · v2' })).toBeVisible()

  // The workbench, by keyboard: exclude QAI, open INTC's lots, save v3 with ⌘S / Ctrl+S.
  await embed.getByRole('link', { name: 'Workbench' }).click()
  await expect(heading).toHaveText('Johnson rebalance')
  await page.getByRole('table', { name: 'Legs · v2' }).getByRole('row', { name: /^QAI/ }).focus()
  await page.keyboard.press('x')
  const draftLegs = page.getByRole('table', { name: 'Legs · draft' })
  await expect(draftLegs.getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true')
  await draftLegs.getByRole('row', { name: /^INTC/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Leg · INTC' })).toBeVisible()
  const bar = page.getByRole('group', { name: 'Draft version' })
  await expect(bar.getByRole('button', { name: 'Save as v3' })).toBeEnabled()
  await page.keyboard.press('ControlOrMeta+s')
  await expect(bar.getByRole('status').filter({ hasText: 'Saved as v3 · posted to the thread.' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Live thread' }).getByRole('list', { name: 'Thread feed' }))
    .toContainText('v3 · Workbench edits: excluded IQ Hedge Multi-Strategy Tracker ETF.')

  // Back in the thread the embed is already v3; approve it.
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await expect(embed.getByRole('table', { name: 'Proposal legs · v3' })).toBeVisible()
  await approveLatest(page, 3)
  await expect(context(page).getByRole('region', { name: 'Approval · Johnson rebalance' })).toContainText('PENDING COMPLIANCE REVIEW')

  // The letter: drafted from v3, edited, sent.
  await threadLink(page, 'Robert Johnson').click()
  await context(page).getByRole('button', { name: 'Ask Client Letter Agent' }).click()
  const draft = context(page).getByRole('article', { name: 'Draft · not sent' })
  await expect(draft).toContainText('from v3')
  await draft.getByRole('button', { name: 'Edit' }).click()
  const editor = draft.getByRole('textbox', { name: 'Edit the letter' })
  await editor.fill(`${await editor.inputValue()}\n\nI will call you on Friday to walk through it.`)
  await draft.getByRole('button', { name: 'Save edit' }).click()
  await context(page).getByRole('article', { name: 'Draft · not sent' }).getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation(page)).toContainText('I will call you on Friday to walk through it.')

  // Robert: only his thread, his question and the one message.
  const viewAs = page.getByLabel('View as')
  await viewAs.selectOption({ label: 'Robert Johnson · Client' })
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await expect(conversation(page)).toContainText('Dear Robert,')
  for (const hidden of ['Proposal Agent', 'Client Letter Agent', 'Draft · not sent', 'Johnson Rebalance Review']) {
    await expect(page.locator('body')).not.toContainText(hidden)
  }

  // Mark: the firm threads, not the Brief; the staged orders pending compliance; no approve button.
  await viewAs.selectOption({ label: 'Mark Davis · Compliance' })
  await expect(threadLink(page, 'Brief')).toHaveCount(0)
  await threadLink(page, 'Johnson Rebalance Review').click()
  const markApproval = context(page).getByRole('region', { name: 'Approval · Johnson rebalance' })
  await expect(markApproval).toContainText('PENDING COMPLIANCE REVIEW')
  await expect(markApproval.getByRole('button')).toHaveCount(0)
})
```

- [ ] **Step 2: Run the story test against the real app**

Run: `VISUAL_PORT=5195 pnpm visual --grep "one presenter"`
Expected: PASS. A failure here is a defect in the task that owns the step that failed; fix it there (with a unit test that pins it) rather than loosening this spec.

- [ ] **Step 3: Regenerate the baselines and look at every one**

Run: `VISUAL_PORT=5195 pnpm visual:update`

Open every PNG under `e2e-visual/__baselines__/` that changed or was created, and check each against this list before going on:
- `brief-light.png`, `brief-dark.png`: "Only you" band; the ranked summary first, OUT before the US Equity line; the Drift Monitor and Harvest Scanner findings with "Take to team thread"; INTC figures read −45,850 USD, 0 USD washed, 7,000 sh; the rs-001 window cited to 2026-03-22.
- `proposal-thread-light.png`, `proposal-thread-dark.png`: the embed with nine legs, SPY marked WARN, no BLOCK; tax readings including "Est. tax added to the return" 10,422 USD; INTC restricted through 2026-03-27 (projected) and 2026-03-22 (recorded); Private Equity "no market to sell into"; "v1 is not approved"; the context column with Approval and "Ask Proposal Agent".
- `workbench-light.png`, `workbench-dark.png`: no thread list; the legs table not scrolling sideways; the tax tape; gauges before and after on one scale; two restriction rulers; Vanguard and TIAA flagged; the live thread in the right column with its composer.
- `robert-letter-light.png`, `robert-letter-dark.png`: "CLIENT CAN SEE" band; only Robert's thread; his question, the letter and its record; no firm vocabulary ("binding", "Supervisory review", agent names).
- Phase 2 baselines (`adrian-johnson-finding-*`, `robert-thread-*`, `account-full-view-light`, `kit-*`): the only intended differences are the new agents under "Agents on this desk" and in "Who can see", the "Ask Proposal Agent" control, the Approval section's absence where there is no proposal, and the kit gallery's new checkbox and number input. Anything else is a regression: find it, fix it in its task, and regenerate.

- [ ] **Step 4: Run the whole visual suite against the new baselines**

Run: `VISUAL_PORT=5195 pnpm visual`
Expected: PASS, including the 1024px checks (no horizontal page scroll, no clipped labels) for every scene. If the workbench legs table clips at 1024px, narrow it in Task 13's `WorkbenchLegs` (the Name column already wraps; shorten a header before removing a column) and regenerate.

- [ ] **Step 5: Full suite, lint, build; commit**

Run: `node_modules/.bin/vitest run && pnpm lint && pnpm build`

```bash
git add e2e-visual/rebalance-job.spec.ts e2e-visual/__baselines__
git commit -m "test(visual): the Phase 3 story end to end; baselines for the Brief, the proposal thread, the workbench and Robert's letter"
```

---

## Self-review notes (for the executor)

- **Spec coverage.** Engine: proposals and versions (Tasks 1, 4, 7), constraint-aware generation (3), edits re-validated with 400 and a reason (2, 4, 9), binding acts and staging (5), agents (6, 7, 8), API (9). Story: Brief and carry (6, 10), proposal embed, revise, version lines (7, 10, 11), approve (5, 15), client letter and send (8, 16). Workbench: route and layout (12), legs, lots, summary (13), editing, real time, keyboard (14), client not found (12). Carry-overs: post-trade drift on the construct step (10, 13), DRIP and held-away in the client's guidance (8), NBA route guard and nba-002 score (17), self-washing buys avoided (3, 7). Testing section: invariants (4, 5, 7, 8), whole-book agents (6, 7), UI end to end (18), baselines (18).
- **Additions the spec implies but does not list:** a draft-revision endpoint (Adrian "edits and sends"), the letter-draft endpoint (the Client Letter Agent drafts "into the drafts panel"), and a `GET /api/workspace/proposals` without `threadId` (the command line's "Proposal · Johnson rebalance"). All are viewer-filtered and answer a client `404`.
