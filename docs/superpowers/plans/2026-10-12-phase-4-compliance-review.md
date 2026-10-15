# Phase 4: Compliance Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On branch `workspace`, make compliance a participant: Mark Davis (`cco-001`) works a supervision queue (staged orders, open alerts, sent client correspondence), records each disposition as an append-only binding act with a required rationale, released orders fill at the frozen day's prices, the session book moves and every engine read sees it, a firm-only archive is the books-and-records surface, and Robert sees nothing new.

**Architecture:** A per-session portfolio ledger (`src/mocks/data/portfolio-ledger.ts`, dependency-free, reset with the workspace store) holds every account the session has moved: positions, lots, recorded realised sales and fills. The three fixture readers (`getPositionsForAccount`, `generateTaxLots`, `openWashSaleWindows` via `allRealisedSales`) consult it first, so drift, previews, the Harvest Scanner, the Drift Monitor, the account view, wash-sale windows and return-level tax all read the moved book without being touched one by one. A fills engine (`src/mocks/workspace/fills.ts`) applies released orders to the ledger with the invariants asserted. Five compliance acts (`src/mocks/workspace/compliance-acts.ts`) join the binding acts; read models for the queue (`supervision.ts`) and the archive (`archive.ts`) feed four viewer-filtered endpoints; a presenter shortcut records Mark's default disposition with a firm-only `viaPresenter` marker. The UI adds `/supervision` (queue beside the item, workbench-style), `/archive`, and the thread's after-release states.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, TanStack Query 5, React Router 6 (v7 future flags), MSW 2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-phase-4-compliance-review-design.md` (binding). Earlier contracts: `docs/superpowers/specs/2026-10-12-phase-3-rebalance-harvest-design.md`, `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 4), the Phase 3 SDD ledger rulings (wording, provenance, client confidentiality).

## Global Constraints

- Work only on branch `workspace` (base `7cd78c8` or a later `workspace` commit containing every task this one depends on — check `git log --oneline -1` before starting and report BLOCKED if a prerequisite task's commit is missing). Never commit to `main`. Push only when the controller says so.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums; ESM; no barrel files. `.tsx` files export only components; helpers and types go in `.ts` siblings. On macOS's case-insensitive filesystem never place `foo.ts` next to `Foo.tsx`. Errors are explicit types (`LedgerInvariantError`), never silent catches.
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`) and `pnpm build`. A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. Restore `tsconfig.tsbuildinfo` / `wrangler.jsonc` with `git checkout --` if a tool modifies them. Never symlink `node_modules` between worktrees.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`). `VISUAL_PORT=5195 pnpm visual:update` only for an intended change, and the implementer opens and looks at every PNG it rewrote. Task 11 adds the Desk links to the thread list and Task 7 changes a Drift Monitor citation, so every Phase 2/3 baseline drifts from those tasks onward; Task 14 regenerates and reviews all of them. Tasks 1–13 do not run `pnpm visual`.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`). Never read the live clock (`new Date()` / `Date.now()` are banned in `src/mocks` by test). Recorded times come from the event clock (`nextAt()`, `eventTime(sequence)`): one minute per event from the frozen now. The NYSE session on 2026-02-25 is `2026-02-25T14:30:00.000Z`–`2026-02-25T21:00:00.000Z` (`nyseSessionUtc`); fills happen inside it (`isDuringNyseSession`), never before the open.
- The INTC harvest `rs-001`: 5,000 INTC sold 2026-02-20, −$32,750, window through 2026-03-22. The story's release sells the remaining 7,000 INTC on 2026-02-25 for $199,150 against $245,000 basis (−$45,850 long-term); its recorded sale is `rs-006` and its window runs through 2026-03-27.
- Every displayed figure comes from the engine; the UI never computes a figure and formats only through `src/kit/measure.ts`. Agent claims and Proposal Agent summaries contain no digits. Act summaries, record ids and fills messages are records, not claims: digits allowed.
- UI uses only kit components (`src/kit/`) for buttons, tables, dialogs, inputs, selects and checkboxes, and only instrument colour tokens. The guardrails in `src/__tests__/guardrails/` stay green.
- No real person's name. Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002`, Mike Chen `user-003`, Mark Davis `cco-001` (compliance), Robert Johnson `cli-001` (client). Nobody but the presenter acts live: Mark's acts happen through "View as" Mark or through the presenter shortcut labelled exactly `Demo · act as Mark Davis`, recorded as `cco-001` with the firm-only `viaPresenter: { presenterId }`.
- Domain wording, exactly: never "cleared" (new text); never "would exceed" for an approaching limit; `cash_capped` reads "held to the model's cash target"; wash-sale scope is the **taxpayer** (owner and spouse, IRAs and Roths included), never "household"; IRA/Roth repurchase disallows a loss permanently; tax rates 40.8% short-term, 23.8% long-term, 31.8% collectibles (`RATE_DISCLOSURE`); a window is stated "through <date>", never "open to <date>".
- Separation of duties: only `cco-001` performs `release_orders`, `return_to_advisor`, `escalate`, `dispose_alert`, `review_correspondence` (advisor and other firm viewers → `403 NOT_PERMITTED`). Client viewers get `404` from every supervision, archive, compliance-act and presenter request, and see nothing new in their thread. Every disposition needs a non-blank rationale (≤ 2,000 characters after trimming). Acts are append-only: nothing edits or deletes a recorded act (the `405` catch-all stays last).
- Visibility words exactly: "Only you" / "Firm only · client can't see" / "CLIENT CAN SEE".
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A repeated or crossing release.** Mark double-clicks Confirm, or the presenter shortcut and Mark's own release cross: the engine records one `release_orders` act and one set of fills; the second answers `409 ALREADY_RELEASED` naming the first act; no lot is sold twice and cash moves once. Tests: Task 4 (engine), Task 12 (UI double click), Task 10 (shortcut double click).
2. **A release against an approval that moved while Mark was reading.** Adrian withdraws, or approves a newer version, after Mark opened the orders item: the release answers `409 APPROVAL_WITHDRAWN` / `409 APPROVAL_SUPERSEDED` with the reason; nothing fills; the Supervision page shows the engine's reason even though the item has left the queue. Tests: Task 4, Task 12.
3. **A blank or padded rationale.** Spaces only, newlines only, or more than 2,000 characters: `400 RATIONALE_REQUIRED` / `400 RATIONALE_TOO_LONG`, no act; the UI keeps Record disposition disabled with the reason while the rationale is blank. Tests: Task 4, Task 5, Task 12.
4. **A client probing compliance.** Robert requests `/api/workspace/supervision`, `/api/workspace/archive`, posts any of the five compliance kinds or the presenter shortcut, or opens `/supervision`, `/supervision/orders/prop-0001` or `/archive`: `404` / "not found", never content; his thread's messages and records are byte-for-byte what they were before the release and the review. Tests: Task 8 (HTTP), Task 4 (thread unchanged), Task 11 and Task 13 (pages).
5. **Fractional and whole-position fills.** A sell that takes fractional shares from several lots (acc-002 IBIT), a sale of a whole position (INTC), a buy of a security the account never held (VWO, GLD): the position disappears rather than showing zero, fractional lots shrink without going negative, a new position opens with one lot dated the fill day, and a second proposal drafted from the moved book names no consumed lot. Tests: Task 3 (fills and the whole-book release), Task 4 (new proposal from the moved book).

## Task order, shared contracts and parallelism

| Task | Depends on | Shares files or types with | May run in parallel with |
|---|---|---|---|
| 1 Types, permissions, the ledger's state, exhaustive views | — | types read by every later task; `workspace-store.ts`, `MessageView.tsx` (Task 10), `proposals-store.ts` (Task 4), `proposal-acts.ts` (Task 4), `proposal-engine.ts` (Task 9) | — |
| 2 Route every engine read through the ledger | 1 | `positions.ts`, `custodian.ts`, `realised-sales.ts`, `tax-return.ts`, `oms.ts` (Task 9), `compliance.ts` (Task 5), `run-key.ts` | — |
| 3 Fills engine and the whole-book release | 2 | `fills.ts`, `pms.ts` (quotes); reads `harvestSubstitutions` that Task 9 fills | 9 |
| 4 Orders acts: release, return, escalate | 3 | `compliance-acts.ts` (Task 5), `proposals.ts`, `proposals-store.ts`, `proposal-acts.ts`, `workspace-store.ts` (Tasks 5, 7) | 9 |
| 5 Alert and correspondence acts | 4 | `compliance-acts.ts`, `acts.ts`, `alerts.ts`, `workspace-store.ts`, `compliance.ts` | 9 |
| 6 Supervision and archive read models | 5 | `supervision.ts`, `archive.ts`, `workspace-supervision.ts` types | 9 |
| 7 Brief re-measure, Drift Monitor "through" | 4 (its story fixture) | `brief.ts`, `brief-remeasure.ts`, `drift-monitor.ts`, `workspace.ts` handler (Task 8), `workspace-store.ts` (Task 5) | 6, 9 |
| 8 Presenter shortcut, HTTP, services, hooks | 6, 7 | `workspace.ts`, `workspace-supervision.ts` handlers, `services/workspace.ts`, `use-workspace.ts` | 9 |
| 9 Proposal Agent harvest-plus-substitute | 2 | `oms.ts`, `proposal-engine.ts`, `proposal-agent.ts` | 3–8 |
| 10 Thread after release, presenter shortcut UI | 8 | `ApprovalPanel.tsx` (Task 11), `ActRecordSlip.tsx`, `act-provenance.ts`, `Workbench.tsx`, `MessageView.tsx`, `ProposalAgentControl.tsx` | 9 |
| 11 Supervision route, queue and item evidence | 10 | `routes.tsx`, `use-destinations.ts`, `ThreadList.tsx`, `shell.test.tsx` (Task 13), `ApprovalPanel.tsx`, `src/workspace/supervision/*` (Task 12) | 9 |
| 12 Disposition panel | 10, 11 | `src/workspace/supervision/*` | 13 |
| 13 Archive screen | 11 | `routes.tsx`, `use-destinations.ts`, `ThreadList.tsx`, `shell.test.tsx`, `src/workspace/archive/*` | 12 |
| 14 End-to-end story and visual baselines | all | `e2e-visual/*` | — |

Everything not in the last column is serial. Parallel tasks run in separate worktrees created from a commit that already contains all of their prerequisites; merge them one at a time with the full suite green between merges. Remember: disjoint file lists are not independence — Task 9 changes `DraftPreview` content that Task 3's fills read (`harvestSubstitutions`), so Task 3's tests construct that field themselves.

## Session portfolio ledger: every read site

Every engine read of positions, lots or realised sales goes through one of three readers, and each reader consults the ledger first. The table is the audit list; Task 2 routes each line and its test pins the readers.

| Read site | What it reads | Routed by |
|---|---|---|
| `positions.ts` `getPositionsForAccount` | positions | ledger book, else `seedPositionsForAccount` |
| `custodian.ts` `generateTaxLots` | lots | ledger lots (+ `repurchaseBlockedUntil` from open windows), else `seedTaxLots` |
| `custodian.ts` `generateTaxLotsWithSaleRisk`, `washSaleAcquisitions` | lots, positions of the taxpayer | `generateTaxLots`, `getPositionsForAccount` |
| `custodian.ts` `generateTransactions` | fixture history | seed positions and `seedTaxLots` (history is the fixture's), plus ledger fills appended as transactions |
| `custodian.ts` handlers `/accounts`, `/accounts/:id`, `/balances`, `/tax-lots`, `/realised-sales` | account cash, lots, windows | `cashBalanceOf`, `generateTaxLotsWithSaleRisk`, `openWashSaleWindowsFor` |
| `realised-sales.ts` `openWashSaleWindows` | realised sales | `allRealisedSales()` (fixture + ledger) |
| `tax-return.ts` `openWashSaleWindowsFor`, `ytdRealisedOnReturn` | windows, realised sales | `openWashSaleWindows`, `allRealisedSales()`; recognised result nets out `washedLoss` |
| `repurchase-restrictions.ts` `repurchaseRestrictionsFor` | recorded windows | `openWashSaleWindowsFor` |
| `oms.ts` `generateRebalanceProposal`, `recutLeg`, `projectDrift`, single-order pre-check | positions, lots, windows, cash | `getPositionsForAccount`, `generateTaxLots`, `openWashSaleWindowsFor`; the ticket's `account.cashBalance` → `cashBalanceOf` |
| `batch-wash-sales.ts` `settleBatchWashSales` | lots | `generateTaxLots` |
| `compliance.ts` `evaluateProposal` | positions, cash | `getPositionsForAccount`; `account.cashBalance` → `cashBalanceOf` |
| `pms.ts` drift (`computeDriftForAccount`), positions, holdings, household endpoints | positions | `getPositionsForAccount` |
| `pms.ts` `USD_SECURITY_QUOTES` (built at import) | prices | seed (prices never move; built before any fill) |
| `agents/drift-monitor.ts` | drift, positions, windows | covered above |
| `agents/harvest-scanner.ts` | lots with sale risk, positions, windows | covered above |
| `agents/pretrade-check.ts` | positions | covered above |
| `agents/proposal-agent.ts` `foreclosedHarvestCaveat` | Harvest Scanner | covered above |
| `workspace/proposal-engine.ts` `unexcludable`, `buildVersion` | positions, generation | covered above |
| `workspace/brief.ts` | agent findings | re-composed on view when the book version moved (Task 7) |
| `workspace/run-key.ts` | run identity | includes the book version once the book has moved, so a re-run after fills measures again |
| `data/nbas.ts` `intcHarvestFacts` | realised sales | `allRealisedSales()` (the NBA list itself is composed at import for the legacy dashboard, not a workspace surface) |
| `data/activities.ts` (import-time `rs-001`, `pos-265`) | fixture facts | unchanged: the activity feed is fixture history |
| `handlers/ai.ts` | lots, windows, positions, cash | covered above; the briefing's `account.cashBalance` → `cashBalanceOf` |

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/types/workspace.ts` | 1 | compliance act kinds, outcomes, `viaPresenter`, `fills` message, optional act thread |
| `src/types/workspace-proposal.ts` | 1 | `Fill`, `HarvestSubstitution`, approval and staged-order statuses, `released` approval state, detail fills and escalation |
| `src/types/workspace-supervision.ts` (new) | 1 | queue items, disposed items, archive entries, compliance act requests |
| `src/mocks/data/people.ts` | 1 | `CCO_ID`; compliance permissions |
| `src/mocks/data/proposals-store.ts` | 1, 4 | released approval state, escalation, fills on the detail |
| `src/mocks/workspace/proposal-acts.ts` | 1, 4 | `recordAct`, closing acts on staged orders, closed proposals refuse |
| `src/workspace/thread/FillsView.tsx` (new), `MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx` | 1 | the fills message in the thread and the live thread |
| `src/workspace/thread/act-kind-label.ts`, `src/workspace/proposal/approval-words.ts`, `ApprovalNote.tsx`, `src/workspace/context/DraftsPanel.tsx` | 1 | labels and words for the new kinds and states |
| `src/mocks/data/portfolio-ledger.ts` (new) | 2 | the session ledger: moved books, recorded sales, fills, book version, reset |
| `src/mocks/data/positions.ts`, `realised-sales.ts`, `handlers/custodian.ts`, `handlers/tax-return.ts`, `handlers/compliance.ts`, `handlers/oms.ts`, `handlers/ai.ts`, `data/nbas.ts`, `workspace/run-key.ts` | 2 | read routing, `cashBalanceOf` |
| `src/mocks/workspace/fills.ts` (new), `src/mocks/handlers/pms.ts` | 3 | applying fills to the ledger with its invariants; quotes carry the asset class |
| `src/mocks/workspace/compliance-acts.ts` (new) | 4, 5 | the five compliance acts |
| `src/mocks/workspace/proposals.ts` | 4 | a new proposal after a filled one; closed proposals refuse |
| `src/mocks/workspace/alerts.ts` (new), `src/mocks/workspace/acts.ts` | 5 | open alerts, evidence fingerprint, record trail; the sent message id |
| `src/mocks/workspace/supervision.ts`, `archive.ts` (new) | 6 | the queue and the archive as each viewer may read them |
| `src/mocks/workspace/brief.ts`, `brief-remeasure.ts` (new), `src/mocks/agents/drift-monitor.ts` | 7 | the Brief re-measured on view; "through" |
| `src/mocks/workspace/presenter.ts` (new), `src/mocks/handlers/workspace-supervision.ts` (new), `workspace.ts`, `src/services/workspace.ts`, `src/hooks/use-workspace.ts` | 8 | endpoints, client functions, hooks |
| `src/mocks/handlers/oms.ts`, `src/mocks/workspace/proposal-engine.ts`, `src/mocks/agents/proposal-agent.ts` | 9 | harvest-plus-substitute |
| `src/workspace/context/ApprovalPanel.tsx`, `src/workspace/thread/ActRecordSlip.tsx`, `act-provenance.ts` (new), `Workbench.tsx`, `ProposalAgentControl.tsx` | 10 | thread after release, presenter shortcut |
| `src/app/routes.tsx`, `src/app/use-destinations.ts`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/supervision/*` (new) | 11, 12 | Supervision |
| `src/workspace/archive/*` (new) | 13 | Archive |
| `e2e-visual/workspace-steps.ts` (new), `compliance-review.spec.ts` (new), `rebalance-job.spec.ts` | 14 | the story and its baselines |

---
### Task 1: Types, permissions, the ledger's state, and the exhaustive views

The contracts every later task uses: five compliance act kinds and their records, the `fills` message, approval and staged-order states for after compliance acts, the supervision and archive types, the ledger's state module (no readers routed yet), and the views that must stay exhaustive over the new kinds.

**Files:**
- Modify: `src/types/workspace.ts`, `src/types/workspace-proposal.ts`, `src/mocks/data/people.ts`, `src/mocks/data/proposals-store.ts`, `src/mocks/data/workspace-store.ts`, `src/mocks/workspace/proposal-acts.ts`, `src/mocks/workspace/proposal-engine.ts:232-236`, `src/workspace/thread/MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx`, `src/workspace/thread/act-kind-label.ts`, `src/workspace/proposal/approval-words.ts`, `src/workspace/proposal/ApprovalNote.tsx`, `src/workspace/proposal/leg-status.ts`, `src/workspace/context/DraftsPanel.tsx` (`staleReason`)
- Create: `src/types/workspace-supervision.ts`, `src/mocks/data/portfolio-ledger.ts`, `src/workspace/thread/FillsView.tsx`
- Test: `src/mocks/data/__tests__/people.test.ts`, `src/mocks/handlers/__tests__/supervision-records.test.ts`, `src/mocks/data/__tests__/proposals-store.test.ts`, `src/mocks/workspace/__tests__/proposal-acts.test.ts`, `src/mocks/data/__tests__/portfolio-ledger-state.test.ts` (new), `src/workspace/__tests__/proposal-words.test.ts`, `src/workspace/__tests__/fills-view.test.tsx` (new)

**Interfaces:**
- Consumes: `store`, `nextAt`, `nextId`, `commitActId` from `@/mocks/data/workspace-store`; `PositionSeed` from `@/types/portfolio`; `CustodianLot` (type) from `@/mocks/handlers/custodian`; `RealisedSale` (type) from `@/mocks/data/realised-sales`; `ComplianceAlert`, `SupervisionRecord` from `@/types/compliance`.
- Produces (later tasks rely on these names exactly):

```ts
// src/types/workspace.ts
export type Subject = { type: 'account' | 'household' | 'client' | 'draft' | 'proposal' | 'alert' | 'message'; id: string }
export type ComplianceActKind = 'release_orders' | 'return_to_advisor' | 'escalate' | 'dispose_alert' | 'review_correspondence'
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'send_to_client' | ComplianceActKind
export type AlertOutcome = 'approve' | 'reject' | 'request_changes'
export type CorrespondenceOutcome = 'reviewed' | 'flagged'
export type ViaPresenter = { presenterId: string }
export type BindingAct = { id: string; kind: BindingActKind; actorId: string; at: string; threadId?: string; subject?: Subject; version?: number; fingerprint: string; summary: string; basis?: LetterBasis; editedBy?: string[]; messageId?: string; rationale?: string; outcome?: AlertOutcome | CorrespondenceOutcome; approvalActId?: string; viaPresenter?: ViaPresenter }
// Message gains:
  | { kind: 'fills'; id: string; threadId: string; at: string; proposalId: string; title: string; version: number; releaseActId: string; fills: Fill[] }

// src/types/workspace-proposal.ts
export type HarvestSubstitution = { assetClass: AssetClass; foreclosed: { symbol: string; name: string }; bought: { symbol: string; name: string }; harvested: boolean }
// ProposalVersion and DraftPreview gain: harvestSubstitutions: HarvestSubstitution[]
export type ApprovalRecord = { …; status: 'active' | 'withdrawn' | 'superseded' | 'returned' | 'released' }
export type StagedOrderStatus = 'pending_compliance' | 'withdrawn' | 'returned' | 'filled'
export type StagedOrder = { …; status: StagedOrderStatus; closedByActId?: string; fillId?: string }
export type Fill = { id: string; stagedOrderId: string; proposalId: string; version: number; accountId: string; symbol: string; name: string; side: 'buy' | 'sell'; quantity: number; price: number; value: number; currency: CurrencyCode; at: string }
export type ApprovalState = | { kind: 'unapproved'; latestVersion: number } | { kind: 'approved'; version: number; latestVersion: number; approverId: string; actId: string } | { kind: 'released'; version: number; latestVersion: number; approverId: string; actId: string; releaseActId: string }
export type Escalation = { actId: string; at: string }
export type ProposalDetail = Proposal & { approval: ApprovalState; staged: StagedOrder[]; fills: Fill[]; escalation?: Escalation }

// src/types/workspace-supervision.ts — see Step 3 for the full file:
// TextMessage, OrdersItem, AlertContext, AlertItem, CorrespondenceItem, SupervisionItem, SupervisionItemKind,
// DisposedItem, SupervisionQueue, ArchiveKind, ArchiveEntry, ArchiveFilters, Archive,
// OrdersActRequest, AlertActRequest, CorrespondenceActRequest, ComplianceActRequest, PresenterItem

// src/mocks/data/people.ts
export const CCO_ID = 'cco-001'

// src/mocks/data/portfolio-ledger.ts
export type LedgerLot = Omit<CustodianLot, 'repurchaseBlockedUntil'>
export type AccountBook = { positions: PositionSeed[]; lots: LedgerLot[] }
export function bookOf(accountId: string): AccountBook | undefined
export function recordedSales(): readonly RealisedSale[]
export function ledgerFills(): readonly Fill[]
export function bookVersion(): number
export function nextLedgerNumber(counter: 'fill' | 'sale'): number
export function commitMove(accountId: string, book: AccountBook, sales: readonly RealisedSale[], fills: readonly Fill[]): void   // version += 1
export function resetLedger(): void

// src/mocks/data/proposals-store.ts (added)
export function releasedApproval(proposalId: string): ApprovalRecord | undefined
export function actOnApproval(kind: BindingActKind, approvalActId: string): BindingAct | undefined
export function escalationOf(approvalActId: string): Escalation | undefined

// src/mocks/workspace/proposal-acts.ts (added)
export function recordAct(act: BindingAct): void            // pushes the act; posts its marker only when it has a thread
export function setApprovalStatus(approval: ApprovalRecord, status: ApprovalRecord['status']): void
export function closeStaging(approvalActId: string, closedByActId: string, status: 'withdrawn' | 'returned'): void

// src/workspace/proposal/leg-status.ts (added)
export const FILL_SIDE_WORDS: Readonly<Record<'buy' | 'sell', string>>   // { buy: 'Bought', sell: 'Sold' }
```

- [ ] **Step 1: Write the failing tests**

Replace the `cco-001` row and add the new act rows in `src/mocks/data/__tests__/people.test.ts`:

```ts
    ['cco-001', 'release_orders', true], ['cco-001', 'return_to_advisor', true], ['cco-001', 'escalate', true],
    ['cco-001', 'dispose_alert', true], ['cco-001', 'review_correspondence', true],
    ['cco-001', 'read_all_firm_threads', true], ['cco-001', 'send_to_client', false], ['cco-001', 'approve_proposal', false],
    ['user-001', 'release_orders', false], ['user-001', 'dispose_alert', false], ['user-002', 'review_correspondence', false],
    ['cli-001', 'release_orders', false],
```

and append:

```ts
describe('phase 4 · separation of duties', () => {
  it('only the compliance officer holds the five compliance acts, and he approves and sends nothing', () => {
    const compliance = ['release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence'] as const
    for (const person of PEOPLE) {
      for (const act of compliance) expect(can(person.id, act), `${person.id} ${act}`).toBe(person.id === CCO_ID)
    }
    expect(personById(CCO_ID)?.name).toBe('Mark Davis')
  })
})
```

(add `CCO_ID` to the import from `'../people'`). In `src/mocks/handlers/__tests__/supervision-records.test.ts` replace `'every reviewer may dispose of a compliance exception'` with:

```ts
  it('every reviewer may dispose of an alert', async () => {
    for (const alertId of ['comp-002', 'comp-004', 'comp-006']) {
      for (const record of await getSupervisionRecords(alertId)) expect(can(record.reviewerId, 'dispose_alert'), record.id).toBe(true)
    }
  })
```

In `src/mocks/data/__tests__/proposals-store.test.ts`, add `harvestSubstitutions: [],` after `excludedLegs: [],` in the `version()` helper, add `escalationOf, releasedApproval` to the import, and append inside `describe('proposals store', …)`:

```ts
  it('a released approval reads as released, with the act that released it, and is no longer the active one', () => {
    const p = seedProposal()
    store().approvals.push({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA', actId: 'REC-0001', approverId: 'user-001', at: 'x', status: 'released' })
    store().acts.push({ id: 'REC-0002', kind: 'release_orders', actorId: 'cco-001', at: 'x', threadId: 'th-johnson-review', subject: { type: 'proposal', id: p.id }, version: 1, fingerprint: 'AAAAAAAA', summary: 'x', rationale: 'Reviewed.', approvalActId: 'REC-0001' })
    expect(activeApproval(p.id)).toBeUndefined()
    expect(releasedApproval(p.id)?.actId).toBe('REC-0001')
    expect(approvalState(p)).toEqual({ kind: 'released', version: 1, latestVersion: 1, approverId: 'user-001', actId: 'REC-0001', releaseActId: 'REC-0002' })
    expect(detailOf(p).fills).toEqual([])
    expect(isDraftStale(letter({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA' }))).toBe(true)
  })

  it('an escalation of the active approval is on the detail', () => {
    const p = seedProposal()
    store().approvals.push({ proposalId: p.id, version: 1, fingerprint: 'AAAAAAAA', actId: 'REC-0001', approverId: 'user-001', at: 'x', status: 'active' })
    expect(detailOf(p).escalation).toBeUndefined()
    store().acts.push({ id: 'REC-0002', kind: 'escalate', actorId: 'cco-001', at: '2026-02-25T12:30:00.000Z', threadId: 'th-johnson-review', fingerprint: 'AAAAAAAA', summary: 'x', rationale: 'Needs the CIO.', approvalActId: 'REC-0001' })
    expect(escalationOf('REC-0001')).toEqual({ actId: 'REC-0002', at: '2026-02-25T12:30:00.000Z' })
    expect(detailOf(p).escalation).toEqual({ actId: 'REC-0002', at: '2026-02-25T12:30:00.000Z' })
  })
```

In `src/mocks/workspace/__tests__/proposal-acts.test.ts`, inside `describe('withdraw_approval', …)` append:

```ts
  it('a firm viewer who may not withdraw is told so before being told nothing is approved', () => {
    const p = seedJohnsonProposal()
    expect(withdrawApproval('user-002', p.id)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
  })

  it('withdrawn staged orders name the act that withdrew them', () => {
    const p = seedJohnsonProposal()
    approveProposal('user-001', p.id, 1, p.versions[0]!.fingerprint)
    const r = withdrawApproval('user-001', p.id)
    if (!r.ok) throw new Error(r.message)
    expect(store().staged.every((o) => o.status === 'withdrawn' && o.closedByActId === r.act.id)).toBe(true)
  })
```

and inside `describe('approve_proposal', …)` add to the "a newer version…" test, after its last `expect`:

```ts
    expect(store().staged.filter((o) => o.version === 1).every((o) => o.closedByActId === r.act.id)).toBe(true)
```

Create `src/mocks/data/__tests__/portfolio-ledger-state.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { Fill } from '@/types/workspace-proposal'
import { resetWorkspaceStore } from '../workspace-store'
import { bookOf, bookVersion, commitMove, ledgerFills, nextLedgerNumber, recordedSales } from '../portfolio-ledger'

const fill: Fill = {
  id: 'fill-0001', stagedOrderId: 'stg-0001', proposalId: 'prop-0001', version: 1, accountId: 'acc-002', symbol: 'INTC', name: 'Intel Corp.',
  side: 'sell', quantity: 7000, price: 28.45, value: 199150, currency: 'USD', at: '2026-02-25T14:30:00.000Z',
}

describe('the portfolio ledger state', () => {
  it('starts with nothing moved, and a commit moves one account and the book version', () => {
    expect(bookVersion()).toBe(0)
    expect(bookOf('acc-002')).toBeUndefined()
    commitMove('acc-002', { positions: [], lots: [] }, [], [fill])
    expect(bookVersion()).toBe(1)
    expect(bookOf('acc-002')).toEqual({ positions: [], lots: [] })
    expect(ledgerFills()).toEqual([fill])
    expect(recordedSales()).toEqual([])
  })

  it('resets with the workspace store: no moved book, no fills, counters from the start', () => {
    commitMove('acc-002', { positions: [], lots: [] }, [], [fill])
    expect(nextLedgerNumber('fill')).toBe(1)
    resetWorkspaceStore()
    expect(bookVersion()).toBe(0)
    expect(bookOf('acc-002')).toBeUndefined()
    expect(ledgerFills()).toEqual([])
    expect(nextLedgerNumber('fill')).toBe(1)
    expect(nextLedgerNumber('sale')).toBe(1)
  })
})
```

Append to `src/workspace/__tests__/proposal-words.test.ts` inside `describe('proposal wording', …)`:

```ts
  it('a released version reads as released and filled, never as approved', () => {
    const released = { kind: 'released', version: 3, latestVersion: 3, approverId: 'user-001', actId: 'REC-0001', releaseActId: 'REC-0003' } as const
    expect(approvalWords(released)).toBe('v3 was released by compliance and filled')
    expect(isApprovedLatest(released)).toBe(false)
  })
```

Create `src/workspace/__tests__/fills-view.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'

describe('the fills message', () => {
  it('lists each fill with side, quantity, price, value and time, and names the release', async () => {
    store().messages.push({
      kind: 'fills', id: 'msg-0099', threadId: 'th-johnson-review', at: '2026-02-25T14:35:00.000Z', proposalId: 'prop-0001',
      title: 'Johnson rebalance', version: 3, releaseActId: 'REC-0003',
      fills: [
        { id: 'fill-0001', stagedOrderId: 'stg-0001', proposalId: 'prop-0001', version: 3, accountId: 'acc-002', symbol: 'INTC', name: 'Intel Corp.', side: 'sell', quantity: 7000, price: 28.45, value: 199150, currency: 'USD', at: '2026-02-25T14:30:00.000Z' },
        { id: 'fill-0002', stagedOrderId: 'stg-0003', proposalId: 'prop-0001', version: 3, accountId: 'acc-002', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', side: 'buy', quantity: 1388, price: 44.8, value: 62182.4, currency: 'USD', at: '2026-02-25T14:31:00.000Z' },
      ],
    })
    renderRoutes(routes, '/t/th-johnson-review')
    const report = await screen.findByRole('article', { name: 'Fills · Johnson rebalance v3' })
    expect(report).toHaveTextContent("Released by REC-0003; filled at the day's prices.")
    const table = within(report).getByRole('table', { name: 'Fills · v3' })
    const [intc, vwo] = within(table).getAllByRole('row').slice(1)
    for (const text of ['INTC', 'Sold', '7,000', '28.45', '199,150', '2026-02-25 14:30 UTC']) expect(intc).toHaveTextContent(text)
    for (const text of ['VWO', 'Bought', '1,388', '44.80', '62,182', '2026-02-25 14:31 UTC']) expect(vwo).toHaveTextContent(text)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/supervision-records.test.ts src/mocks/data/__tests__/proposals-store.test.ts src/mocks/workspace/__tests__/proposal-acts.test.ts src/mocks/data/__tests__/portfolio-ledger-state.test.ts src/workspace/__tests__/proposal-words.test.ts src/workspace/__tests__/fills-view.test.tsx --testTimeout 30000`
Expected: FAIL — `CCO_ID` and `portfolio-ledger` do not exist, `release_orders` is not an act, the fills message has no view.

- [ ] **Step 3: Write the types**

Replace `src/types/workspace.ts` with:

```ts
import type { Fill } from './workspace-proposal'

export type Role = 'advisor' | 'csa' | 'analyst' | 'compliance' | 'client'
export type Person = { id: string; name: string; role: Role }
export type AgentId = 'drift-monitor' | 'pretrade-check' | 'harvest-scanner' | 'proposal' | 'client-letter'
export type AgentScope = { may: string[]; mayNot: string[] }
/** What an agent produces: findings in a thread, proposal versions, or client-letter drafts. */
export type AgentOutput = 'findings' | 'proposals' | 'letters'
export type AgentProfile = { id: AgentId; name: string; produces: AgentOutput; scope: AgentScope }
export type Visibility = 'private' | 'internal' | 'client'
export type Subject = { type: 'account' | 'household' | 'client' | 'draft' | 'proposal' | 'alert' | 'message'; id: string }
export type Thread = { id: string; title: string; visibility: Visibility; ownerId?: string; clientId?: string; memberIds: string[]; agentIds: AgentId[]; subject?: Subject }
export type FigureUnit = 'USD' | 'pp' | '%' | 'sh' | 'd'
export type Figure = { label: string; value: number; unit: FigureUnit; source: string }   // pp and % values are fractions (0.132)
export type Citation = { source: string; asOf: string }
export type Attention = 'info' | 'attention'
export type VersionAuthor = { kind: 'agent'; agentId: AgentId } | { kind: 'person'; personId: string }
export type CarriedFinding = { agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention }
export type BriefItem = { findingId: string; agentId: AgentId; claim: string; attention: Attention }
export type EmbedKind = 'drift' | 'rebalance_preview'
export type Message =
  | { kind: 'text'; id: string; threadId: string; authorId: string; at: string; body: string }
  | { kind: 'agent_finding'; id: string; threadId: string; agentId: AgentId; at: string; claim: string; figures: Figure[]; citations: Citation[]; attention: Attention; runKey: string }
  | { kind: 'embed'; id: string; threadId: string; authorId: string; at: string; embed: EmbedKind; subject: Subject }
  | { kind: 'act'; id: string; threadId: string; at: string; actId: string }
  | { kind: 'proposal'; id: string; threadId: string; agentId: AgentId; at: string; proposalId: string }
  | { kind: 'proposal_version'; id: string; threadId: string; at: string; proposalId: string; version: number; author: VersionAuthor; changeSummary: string }
  | { kind: 'carried'; id: string; threadId: string; at: string; carriedBy: string; fromThreadId: string; findingId: string; finding: CarriedFinding }
  | { kind: 'brief_summary'; id: string; threadId: string; at: string; items: BriefItem[] }
  /** The execution report for released orders, posted in the proposal's team thread after its fills. */
  | { kind: 'fills'; id: string; threadId: string; at: string; proposalId: string; title: string; version: number; releaseActId: string; fills: Fill[] }
/** The acts only compliance performs. */
export type ComplianceActKind = 'release_orders' | 'return_to_advisor' | 'escalate' | 'dispose_alert' | 'review_correspondence'
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'send_to_client' | ComplianceActKind
export type AlertOutcome = 'approve' | 'reject' | 'request_changes'
export type CorrespondenceOutcome = 'reviewed' | 'flagged'
/** Firm-only: the act was recorded through the presenter's "Demo · act as Mark Davis" shortcut, by this presenter. */
export type ViaPresenter = { presenterId: string }
export type BindingAct = {
  id: string
  kind: BindingActKind
  actorId: string
  at: string
  /** Where the act's record slip is posted. An alert disposition and a correspondence review are recorded outside any thread. */
  threadId?: string
  subject?: Subject
  version?: number
  fingerprint: string
  summary: string
  basis?: LetterBasis
  editedBy?: string[]
  /** The message a send_to_client act delivered. */
  messageId?: string
  /** Why compliance disposed of the item as it did; every compliance act carries one. */
  rationale?: string
  outcome?: AlertOutcome | CorrespondenceOutcome
  /** The approval a release, return or escalation acted on. */
  approvalActId?: string
  viaPresenter?: ViaPresenter
}
export type LetterBasis = { proposalId: string; version: number; fingerprint: string }
export type Draft = { id: string; clientThreadId: string; authorId: string; body: string; createdAt: string; agentId?: AgentId; basis?: LetterBasis; figures?: Figure[]; supersedes?: string; editorIds?: string[]; stale?: boolean }
export type ThreadDetail = { thread: Thread; messages: Message[] }
export type Act = BindingActKind | 'post_firm' | 'draft_for_client' | 'read_all_firm_threads'
/** permissions: personId → the acts that person may perform, computed by the engine's can(). The UI never derives permissions itself. */
export type Directory = { people: Person[]; agents: AgentProfile[]; permissions: Record<string, Act[]> }
```

In `src/types/workspace-proposal.ts`:

- after the `ExcludedLeg` type add:

```ts
/**
 * A buy the Proposal Agent moved off a security the Harvest Scanner flags for this taxpayer, so the
 * flagged loss is not foreclosed (a sale within thirty days of the purchase would be washed).
 * `harvested`: the loss sat in this account, and the version sells its loss lots now.
 */
export type HarvestSubstitution = {
  assetClass: AssetClass
  foreclosed: { symbol: string; name: string }
  bought: { symbol: string; name: string }
  harvested: boolean
}
```

- in `ProposalVersion`, after `excludedLegs: ExcludedLeg[]`, add `harvestSubstitutions: HarvestSubstitution[]`;
- replace the `DraftPreview` line with:

```ts
export type DraftPreview = Pick<ProposalVersion, 'preview' | 'pretrade' | 'legFacts' | 'excludedLegs' | 'harvestSubstitutions' | 'summary' | 'fingerprint'>
```

- replace `ApprovalRecord`, `StagedOrder`, `ApprovalState` and `ProposalDetail` with:

```ts
/**
 * The approval of one exact version, pinned to its fingerprint and the binding act that recorded it.
 * It leaves `active` when the approver withdraws it, a newer approval supersedes it, compliance
 * returns it to the advisor, or compliance releases its orders.
 */
export type ApprovalRecord = { proposalId: string; version: number; fingerprint: string; actId: string; approverId: string; at: string; status: 'active' | 'withdrawn' | 'superseded' | 'returned' | 'released' }

export type StagedOrderStatus = 'pending_compliance' | 'withdrawn' | 'returned' | 'filled'

/** An order staged from an approved version. Compliance releases it (filled) or returns it; the approver may withdraw it. */
export type StagedOrder = {
  id: string; proposalId: string; version: number; accountId: string; symbol: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number
  currency: CurrencyCode; status: StagedOrderStatus; stagedAt: string; approvalActId: string
  /** The act that withdrew, returned or released it. */
  closedByActId?: string
  fillId?: string
}

/** One released order executed at the frozen day's price, inside the NYSE session. `value` is quantity × price, to the cent. */
export type Fill = {
  id: string; stagedOrderId: string; proposalId: string; version: number; accountId: string; symbol: string; name: string
  side: 'buy' | 'sell'; quantity: number; price: number; value: number; currency: CurrencyCode; at: string
}

/** Where a proposal stands: approved on one version (possibly behind the latest), released and filled, or not approved. */
export type ApprovalState =
  | { kind: 'unapproved'; latestVersion: number }
  | { kind: 'approved'; version: number; latestVersion: number; approverId: string; actId: string }
  | { kind: 'released'; version: number; latestVersion: number; approverId: string; actId: string; releaseActId: string }

/** Compliance escalated the active approval's orders: they stay held. */
export type Escalation = { actId: string; at: string }

/** A proposal as the API serves it: its approval state, staged orders, fills and any escalation included. */
export type ProposalDetail = Proposal & { approval: ApprovalState; staged: StagedOrder[]; fills: Fill[]; escalation?: Escalation }
```

Create `src/types/workspace-supervision.ts`:

```ts
import type { ComplianceAlert, SupervisionRecord } from './compliance'
import type { AlertOutcome, BindingAct, BindingActKind, CorrespondenceOutcome, Message } from './workspace'
import type { ApprovalRecord, Escalation, Fill, ProposalVersion, StagedOrder } from './workspace-proposal'

export type TextMessage = Extract<Message, { kind: 'text' }>

/** Orders staged from one approval, as compliance reviews them: the approval record and the version it names, never re-run. */
export type OrdersItem = {
  kind: 'orders'
  /** The proposal id. */
  id: string
  title: string
  proposalId: string
  accountId: string
  accountName: string
  clientId: string
  threadId: string
  approval: ApprovalRecord
  version: ProposalVersion
  latestVersion: number
  staged: StagedOrder[]
  fills: Fill[]
  escalation?: Escalation
  /** The evidence a disposition acts on: the approved version's fingerprint. */
  fingerprint: string
}

export type AlertContext = { accountId?: string; accountName?: string; clientId?: string; clientName?: string }

export type AlertItem = {
  kind: 'alert'
  id: string
  title: string
  alert: ComplianceAlert
  /** The alert's supervision records: the fixtures' and the session's, in order. */
  trail: SupervisionRecord[]
  context: AlertContext
  /** Set once the session has disposed of it. */
  disposition?: AlertOutcome
  fingerprint: string
}

export type CorrespondenceItem = {
  kind: 'correspondence'
  /** The sent message's id. */
  id: string
  title: string
  threadId: string
  clientId: string
  clientName: string
  /** The message exactly as the client received it. */
  message: TextMessage
  /** The firm's send record, with its provenance (basis, editors). */
  sendAct: BindingAct
  flagged: boolean
  fingerprint: string
}

export type SupervisionItem = OrdersItem | AlertItem | CorrespondenceItem
export type SupervisionItemKind = SupervisionItem['kind']
export type DisposedItem = { item: SupervisionItem; act: BindingAct }
export type SupervisionQueue = { orders: OrdersItem[]; alerts: AlertItem[]; correspondence: CorrespondenceItem[]; disposedToday: DisposedItem[] }

export type ArchiveKind = BindingActKind | 'sent_message'
export type ArchiveEntry =
  | { kind: 'act'; id: string; at: string; act: BindingAct; clientId?: string; clientName?: string; threadId?: string; threadTitle?: string }
  | { kind: 'sent_message'; id: string; at: string; message: TextMessage; actId: string; fingerprint: string; clientId: string; clientName: string; threadId: string; threadTitle: string }
export type ArchiveFilters = { clientId?: string; kind?: ArchiveKind; from?: string; to?: string }
/** The archive a viewer may read, filtered; `clients` and `dates` list what the unfiltered archive holds, for the filter controls. */
export type Archive = { entries: ArchiveEntry[]; clients: { id: string; name: string }[]; dates: string[] }

type Disposition = { fingerprint: string; rationale: string }
export type OrdersActRequest = Disposition & { kind: 'release_orders' | 'return_to_advisor' | 'escalate'; proposalId: string; approvalActId: string }
export type AlertActRequest = Disposition & { kind: 'dispose_alert'; alertId: string; outcome: AlertOutcome }
export type CorrespondenceActRequest = Disposition & { kind: 'review_correspondence'; messageId: string; outcome: CorrespondenceOutcome }
export type ComplianceActRequest = OrdersActRequest | AlertActRequest | CorrespondenceActRequest

/** An item the presenter shortcut disposes of with Mark's default disposition. */
export type PresenterItem = { kind: SupervisionItemKind; id: string }
```

- [ ] **Step 4: Permissions, the ledger state, and the store**

In `src/mocks/data/people.ts`, after `PEOPLE` add `export const CCO_ID = 'cco-001'`, and replace the compliance permissions line:

```ts
  compliance: ['post_firm', 'read_all_firm_threads', 'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence'],
```

Create `src/mocks/data/portfolio-ledger.ts`:

```ts
import type { PositionSeed } from '@/types/portfolio'
import type { Fill } from '@/types/workspace-proposal'
import type { CustodianLot } from '@/mocks/handlers/custodian'
import type { RealisedSale } from './realised-sales'

/**
 * The session's portfolio ledger: every account the session has moved, with its positions and lots
 * as they stand after its fills, the realised sales those fills recorded, and the fills themselves.
 * An account with no entry is the fixture's. This module imports types only, so the fixture readers
 * (`positions.ts`, `custodian.ts`, `realised-sales.ts`) can consult it without an import cycle.
 */

/** A lot as the ledger keeps it: `repurchaseBlockedUntil` is read from the open windows at read time, never stored. */
export type LedgerLot = Omit<CustodianLot, 'repurchaseBlockedUntil'>
/** One account's book after it has moved: positions weightless, as `positions.ts` stores them, and lots. */
export type AccountBook = { positions: PositionSeed[]; lots: LedgerLot[] }

type LedgerCounter = 'fill' | 'sale'
type LedgerState = { books: Map<string, AccountBook>; sales: RealisedSale[]; fills: Fill[]; version: number; counters: Record<LedgerCounter, number> }

const empty = (): LedgerState => ({ books: new Map(), sales: [], fills: [], version: 0, counters: { fill: 0, sale: 0 } })
let ledger = empty()

export function bookOf(accountId: string): AccountBook | undefined {
  return ledger.books.get(accountId)
}

export const recordedSales = (): readonly RealisedSale[] => ledger.sales
export const ledgerFills = (): readonly Fill[] => ledger.fills
/** How many times the book has moved this session; 0 is the fixtures' book. */
export const bookVersion = (): number => ledger.version

export function nextLedgerNumber(counter: LedgerCounter): number {
  ledger.counters[counter] += 1
  return ledger.counters[counter]
}

/** One release, committed whole: the account's new book, the sales it recorded and its fills. */
export function commitMove(accountId: string, book: AccountBook, sales: readonly RealisedSale[], fills: readonly Fill[]): void {
  ledger.books.set(accountId, book)
  ledger.sales.push(...sales)
  ledger.fills.push(...fills)
  ledger.version += 1
}

export function resetLedger(): void {
  ledger = empty()
}
```

In `src/mocks/data/workspace-store.ts`, import `resetLedger` from `'./portfolio-ledger'` and make the reset clear both:

```ts
export function resetWorkspaceStore(): void {
  state = undefined
  resetLedger()
}
```

In `src/mocks/data/proposals-store.ts`: import `BindingAct`, `BindingActKind` from `@/types/workspace`, `Escalation` from `@/types/workspace-proposal`, and `ledgerFills` from `'./portfolio-ledger'`; replace `approvalState` and `detailOf` and add the three helpers:

```ts
export function releasedApproval(proposalId: string): ApprovalRecord | undefined {
  return store().approvals.find((a) => a.proposalId === proposalId && a.status === 'released')
}

/** The act of `kind` that acted on the approval recorded as `approvalActId`. */
export function actOnApproval(kind: BindingActKind, approvalActId: string): BindingAct | undefined {
  return store().acts.find((a) => a.kind === kind && a.approvalActId === approvalActId)
}

export function escalationOf(approvalActId: string): Escalation | undefined {
  const act = actOnApproval('escalate', approvalActId)
  return act ? { actId: act.id, at: act.at } : undefined
}

/** Approval belongs to one exact version; a newer version leaves it on the older one. Released orders close the proposal. */
export function approvalState(proposal: Proposal): ApprovalState {
  const latest = latestVersion(proposal).n
  const active = activeApproval(proposal.id)
  if (active) return { kind: 'approved', version: active.version, latestVersion: latest, approverId: active.approverId, actId: active.actId }
  const released = releasedApproval(proposal.id)
  const release = released && actOnApproval('release_orders', released.actId)
  return released && release
    ? { kind: 'released', version: released.version, latestVersion: latest, approverId: released.approverId, actId: released.actId, releaseActId: release.id }
    : { kind: 'unapproved', latestVersion: latest }
}

export function detailOf(proposal: Proposal): ProposalDetail {
  const active = activeApproval(proposal.id)
  const escalation = active && escalationOf(active.actId)
  return {
    ...proposal, approval: approvalState(proposal), staged: stagedFor(proposal.id),
    fills: ledgerFills().filter((f) => f.proposalId === proposal.id),
    ...(escalation ? { escalation } : {}),
  }
}
```

In `src/mocks/workspace/proposal-acts.ts` replace `record`, `withdrawStaging` and `setStatus` with exported versions that name the closing act, and use them:

```ts
/** Records an act; one recorded in a thread also posts its marker there. */
export function recordAct(act: BindingAct): void {
  const s = store()
  s.acts.push(act)
  if (act.threadId === undefined) return
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: act.threadId, at: nextAt(), actId: act.id }
  s.messages.push(marker)
}

/** Closes the approval's pending orders, naming the act that closed them. */
export function closeStaging(approvalActId: string, closedByActId: string, status: 'withdrawn' | 'returned'): void {
  const s = store()
  s.staged = s.staged.map((o) => (o.approvalActId === approvalActId && o.status === 'pending_compliance' ? { ...o, status, closedByActId } : o))
}

export function setApprovalStatus(approval: ApprovalRecord, status: ApprovalRecord['status']): void {
  const s = store()
  s.approvals = s.approvals.map((a) => (a.actId === approval.actId ? { ...a, status } : a))
}
```

In `approveProposal`: replace `setStatus(previous, 'superseded')` / `withdrawStaging(previous.actId)` with `setApprovalStatus(previous, 'superseded')` / `closeStaging(previous.actId, actId, 'withdrawn')`, and the final `record(act)` with `recordAct(act)`. Replace `withdrawApproval` with (permission before state, and the closing act named):

```ts
export function withdrawApproval(viewerId: string, proposalId: string): Recorded | ActFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return NOT_FOUND
  const notPermitted: ActFailure = { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the approver can withdraw this approval.' }
  if (!can(viewerId, 'withdraw_approval')) return notPermitted
  const active = activeApproval(proposal.id)
  if (!active) return { ok: false, status: 409, code: 'NOT_APPROVED', message: 'No version of this proposal is approved.' }
  if (active.approverId !== viewerId) return notPermitted
  const act: BindingAct = {
    id: commitActId(), kind: 'withdraw_approval', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: active.version, fingerprint: active.fingerprint,
    summary: `Withdrew the approval of v${active.version} of the ${proposal.title}`,
  }
  setApprovalStatus(active, 'withdrawn')
  closeStaging(active.actId, act.id, 'withdrawn')
  recordAct(act)
  return { ok: true, act }
}
```

In `src/mocks/workspace/proposal-engine.ts` `buildVersion`, add `harvestSubstitutions: []` to `built` (Task 9 fills it):

```ts
    built: { preview, pretrade, legFacts, excludedLegs: edited.excludedLegs, harvestSubstitutions: [], summary: taxSummaryOf(preview), fingerprint: fingerprint(JSON.stringify(content)) },
```

- [ ] **Step 5: The exhaustive views and their words**

In `src/workspace/proposal/leg-status.ts` add:

```ts
/** A fill is past tense: what was done, not what is proposed. */
export const FILL_SIDE_WORDS: Readonly<Record<'buy' | 'sell', string>> = { buy: 'Bought', sell: 'Sold' }
```

Create `src/workspace/thread/FillsView.tsx`:

```tsx
import { useId } from 'react'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { fmtMoney, fmtPrice, fmtQuantity, fmtTimestamp } from '@/kit/measure'
import { FILL_SIDE_WORDS } from '@/workspace/proposal/leg-status'
import type { Message } from '@/types/workspace'

type FillsMessage = Extract<Message, { kind: 'fills' }>

/** The execution report for released orders: each fill at the day's price, in the order it executed. */
export function FillsView({ message }: { message: FillsMessage }) {
  const titleId = useId()
  const currency = message.fills[0]?.currency ?? ''
  return (
    <article aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={titleId} className="text-body font-semibold">{`Fills · ${message.title} v${message.version}`}</h2>
        <span className="text-label uppercase text-ink-3">Execution</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-body text-ink-2">{`Released by ${message.releaseActId}; filled at the day's prices.`}</p>
      <DataTable caption={`Fills · v${message.version}`} rows={message.fills} getRowId={(f) => f.id} noun={{ singular: 'fill', plural: 'fills' }} density="dense"
        columns={[
          { id: 'symbol', header: 'Symbol', cell: (f) => f.symbol },
          { id: 'side', header: 'Side', cell: (f) => FILL_SIDE_WORDS[f.side] },
          { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (f) => <Num text={fmtQuantity(f.quantity)} /> },
          { id: 'price', header: 'Price', unit: currency, align: 'right', cell: (f) => fmtPrice(f.price) },
          { id: 'value', header: 'Value', unit: currency, align: 'right', cell: (f) => fmtMoney(f.value) },
          { id: 'at', header: 'Time', cell: (f) => fmtTimestamp(f.at) },
        ]} />
    </article>
  )
}
```

In `src/workspace/thread/MessageView.tsx` import `FillsView` from `'./FillsView'` and add before `default:`:

```tsx
    case 'fills':
      return <FillsView message={message} />
```

In `src/workspace/workbench/CompactMessage.tsx` add after the `brief_summary` case:

```tsx
    case 'fills': return <Line who="Execution" at={message.at}>{`${message.fills.length} ${message.fills.length === 1 ? 'order' : 'orders'} filled from v${message.version}.`}</Line>
```

Replace `ACT_KIND_LABEL` in `src/workspace/thread/act-kind-label.ts`:

```ts
export const ACT_KIND_LABEL: Readonly<Record<BindingActKind, string>> = {
  approve_proposal: 'Approve proposal',
  withdraw_approval: 'Withdraw approval',
  send_to_client: 'Send to client',
  release_orders: 'Release orders',
  return_to_advisor: 'Return to advisor',
  escalate: 'Escalate',
  dispose_alert: 'Dispose alert',
  review_correspondence: 'Review correspondence',
}
```

Replace `approvalWords` in `src/workspace/proposal/approval-words.ts`:

```ts
/** Approval belongs to one exact version; a newer version is said to be unapproved. Released orders close the proposal. */
export function approvalWords(state: ApprovalState): string {
  switch (state.kind) {
    case 'unapproved': return `v${state.latestVersion} is not approved`
    case 'released': return `v${state.version} was released by compliance and filled`
    case 'approved': return state.version === state.latestVersion ? `v${state.version} is approved` : `Approval applies to v${state.version}; v${state.latestVersion} is unapproved`
  }
}
```

Replace the body of `ApprovalNote` in `src/workspace/proposal/ApprovalNote.tsx`:

```tsx
export function ApprovalNote({ state }: { state: ApprovalState }) {
  const approvedLatest = isApprovedLatest(state)
  const tag = state.kind === 'released' ? 'FILLED' : approvedLatest ? 'APPROVED' : state.kind === 'approved' ? 'NEWER VERSION UNAPPROVED' : 'NOT APPROVED'
  return (
    <p className="flex flex-wrap items-baseline gap-2 text-body">
      <Tag tone={approvedLatest || state.kind === 'released' ? 'solid' : 'outline'}>{tag}</Tag>
      <span>{approvalWords(state)}</span>
    </p>
  )
}
```

In `src/workspace/context/DraftsPanel.tsx` replace `staleReason`'s `why` with:

```ts
  const why = approval?.kind === 'released' ? `The orders from ${from} were filled; this letter was written before they were placed.`
    : approval?.kind === 'approved' && approval.version !== draft.basis?.version ? `The approval moved to v${approval.version}; this letter is from ${from}.`
    : approval?.kind === 'unapproved' ? `The approval of ${from} was withdrawn.`
    : `${from} is no longer the approved version.`
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/supervision-records.test.ts src/mocks/data/__tests__/proposals-store.test.ts src/mocks/workspace/__tests__/proposal-acts.test.ts src/mocks/data/__tests__/portfolio-ledger-state.test.ts src/workspace/__tests__/proposal-words.test.ts src/workspace/__tests__/fills-view.test.tsx --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`: all green (the type changes are additive; `tsc` finds every consumer of the changed unions).

- [ ] **Step 7: Commit**

```bash
git add src/types src/mocks/data/people.ts src/mocks/data/portfolio-ledger.ts src/mocks/data/proposals-store.ts src/mocks/data/workspace-store.ts src/mocks/workspace/proposal-acts.ts src/mocks/workspace/proposal-engine.ts src/workspace src/mocks/data/__tests__ src/mocks/handlers/__tests__/supervision-records.test.ts src/mocks/workspace/__tests__/proposal-acts.test.ts
git commit -m "feat(workspace): phase 4 contracts — compliance acts, fills, supervision types, the ledger's state

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Route every engine read through the ledger

The three fixture readers consult the ledger first; the cash read sites read the CASH position; the run key carries the book version once it has moved. After this task, a hand-built move of acc-002 is what every engine surface sees, and a reset restores the seed. Nothing writes the ledger yet except the test.

**Files:**
- Modify: `src/mocks/data/positions.ts`, `src/mocks/data/realised-sales.ts`, `src/mocks/handlers/custodian.ts`, `src/mocks/handlers/tax-return.ts`, `src/mocks/handlers/compliance.ts` (`evaluateProposal` cash), `src/mocks/handlers/oms.ts:1280`, `src/mocks/handlers/ai.ts:382`, `src/mocks/data/nbas.ts:116`, `src/mocks/workspace/run-key.ts`
- Test: `src/mocks/data/__tests__/portfolio-ledger-reads.test.ts` (new)

**Interfaces:**
- Consumes: `bookOf`, `recordedSales`, `ledgerFills`, `bookVersion`, `commitMove`, `AccountBook` (Task 1).
- Produces:

```ts
// src/mocks/data/positions.ts
export function seedPositionsForAccount(accountId: string, totalValue: number): Position[]   // the fixtures' book (old body)
export function getPositionsForAccount(accountId: string, totalValue: number): Position[]    // ledger book, else seed
export function cashBalanceOf(account: Pick<Account, 'id' | 'totalValue' | 'cashBalance'>): number

// src/mocks/data/realised-sales.ts
export type RealisedSale = { …; /** ≤ 0: the part of the loss §1091 washed, not recognised. */ washedLoss?: number }
export function allRealisedSales(): RealisedSale[]          // fixtures, then the session's recorded sales

// src/mocks/handlers/custodian.ts
export function seedTaxLots(accountId: string, totalValue: number): CustodianLot[]  // the fixtures' lots (old body)
export function generateTaxLots(accountId: string, totalValue: number): CustodianLot[] // ledger lots + blocks, else seed
```

- [ ] **Step 1: Write the failing test**

Create `src/mocks/data/__tests__/portfolio-ledger-reads.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { Fill } from '@/types/workspace-proposal'
import { accounts } from '../accounts'
import { cashBalanceOf, getPositionsForAccount, seedPositionsForAccount } from '../positions'
import type { RealisedSale } from '../realised-sales'
import { commitMove } from '../portfolio-ledger'
import { resetWorkspaceStore } from '../workspace-store'
import { generateTaxLots, generateTransactions, seedTaxLots } from '@/mocks/handlers/custodian'
import { openWashSaleWindowsFor, taxReturnFor, ytdRealisedOnReturn } from '@/mocks/handlers/tax-return'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { runKeyOf } from '@/mocks/workspace/run-key'
import { MOCK_TODAY_ISO } from '@/lib/clock'

const acc002 = accounts.find((a) => a.id === 'acc-002')!
const SALE: RealisedSale = {
  id: 'rs-006', accountId: 'acc-002', householdId: 'hh-001', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-25',
  quantity: 7000, proceeds: 199_150, costBasis: 245_000, realisedGainLoss: -45_850, holdingPeriod: 'long',
}
const FILL: Fill = {
  id: 'fill-0001', stagedOrderId: 'stg-0001', proposalId: 'prop-0001', version: 3, accountId: 'acc-002', symbol: 'INTC', name: 'Intel Corp.',
  side: 'sell', quantity: 7000, price: 28.45, value: 199_150, currency: 'USD', at: '2026-02-25T14:30:00.000Z',
}

/** acc-002 as if its 7,000 INTC had sold at the mark: no INTC position or lot, the proceeds in cash. */
function sellIntcByHand(sale: RealisedSale = SALE) {
  const positions = seedPositionsForAccount('acc-002', acc002.totalValue)
    .filter((p) => p.symbol !== 'INTC')
    .map(({ weight: _weight, ...p }) => (p.symbol === 'CASH' ? { ...p, price: p.marketValue + 199_150, marketValue: p.marketValue + 199_150, costBasis: p.costBasis + 199_150 } : p))
  const lots = seedTaxLots('acc-002', acc002.totalValue).filter((l) => l.positionId !== 'pos-023').map(({ repurchaseBlockedUntil: _until, ...l }) => l)
  commitMove('acc-002', { positions, lots }, [sale], [FILL])
}

async function json(path: string) {
  return (await fetch(`/api${path}`)).json()
}

describe('every engine read sees the moved book', () => {
  it('positions, weights and cash', async () => {
    sellIntcByHand()
    const positions = getPositionsForAccount('acc-002', acc002.totalValue)
    expect(positions.some((p) => p.symbol === 'INTC')).toBe(false)
    expect(positions.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(1, 9)
    expect(cashBalanceOf(acc002)).toBe(424_654)
    expect((await json('/custodian/accounts/acc-002/balances')).cashBalance).toBe(424_654)
    expect((await json('/custodian/accounts/acc-002')).cashBalance).toBe(424_654)
    expect(evaluateProposal('acc-002', [])?.projectedCash).toBe(424_654)
  })

  it('lots, windows and the return-level results', () => {
    const returnId = taxReturnFor(acc002)!
    const before = ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm
    sellIntcByHand()
    expect(generateTaxLots('acc-002', acc002.totalValue).some((l) => l.id === 'lot-pos-023-0')).toBe(false)
    expect(generateTaxLots('acc-002', acc002.totalValue).every((l) => 'repurchaseBlockedUntil' in l)).toBe(true)
    expect(openWashSaleWindowsFor(acc002, MOCK_TODAY_ISO).find((w) => w.id === 'rs-006')).toMatchObject({ symbol: 'INTC', end: '2026-03-27' })
    expect(ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm).toBe(before - 45_850)
  })

  it('a washed part of a recorded loss is not recognised on the return', () => {
    const returnId = taxReturnFor(acc002)!
    const before = ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm
    sellIntcByHand({ ...SALE, washedLoss: -10_000 })
    expect(ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm).toBe(before - 35_850)
  })

  it('drift is measured on the new holdings', () => {
    const usEquity = () => computeDriftForAccount(acc002).assetClassDrifts.find((d) => d.assetClass === 'us_equity')!.actual
    const before = usEquity()
    sellIntcByHand()
    expect(before - usEquity()).toBeCloseTo(199_150 / acc002.totalValue, 4)
  })

  it('the transaction history keeps the fixtures and appends the fills', () => {
    sellIntcByHand()
    const txns = generateTransactions('acc-002', acc002.totalValue)
    expect(txns.find((t) => t.id === 'txn-fill-0001')).toMatchObject({ type: 'sell', symbol: 'INTC', amount: 199_150, quantity: 7000, date: '2026-02-25T14:30:00.000Z' })
    expect(txns.find((t) => t.id === 'txn-rs-001')).toBeDefined()
    expect(txns.find((t) => t.id === 'txn-acc-002-opening-INTC')?.quantity).toBe(12_000)
  })

  it('a run after the book moves is a new run', () => {
    const subject = { type: 'account', id: 'acc-002' } as const
    expect(runKeyOf('drift-monitor', 'th-brief', subject)).not.toMatch(/book/)
    sellIntcByHand()
    expect(runKeyOf('drift-monitor', 'th-brief', subject)).toMatch(/\|book 1$/)
  })

  it('a reset restores the seed everywhere', () => {
    sellIntcByHand()
    resetWorkspaceStore()
    expect(getPositionsForAccount('acc-002', acc002.totalValue).find((p) => p.symbol === 'INTC')?.quantity).toBe(7000)
    expect(cashBalanceOf(acc002)).toBe(225_504)
    expect(openWashSaleWindowsFor(acc002, MOCK_TODAY_ISO).some((w) => w.id === 'rs-006')).toBe(false)
    expect(generateTaxLots('acc-002', acc002.totalValue).some((l) => l.id === 'lot-pos-023-0')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/mocks/data/__tests__/portfolio-ledger-reads.test.ts --testTimeout 30000`
Expected: FAIL — `seedPositionsForAccount`, `seedTaxLots`, `cashBalanceOf` do not exist.

- [ ] **Step 3: Route the readers**

`src/mocks/data/positions.ts`: add `import type { Account } from '@/types/account'` and `import { bookOf } from './portfolio-ledger'`; rename the existing `getPositionsForAccount` to `seedPositionsForAccount` (its doc comment becomes "Positions as the fixtures state them, weights derived: the book before the session moved it. Two paths: …"), and add after it:

```ts
/** Positions for an account as they stand: the ledger's book once the session has moved it, else the fixtures'. */
export function getPositionsForAccount(accountId: string, totalValue: number): Position[] {
  const moved = bookOf(accountId)
  return moved ? withDerivedWeights(moved.positions, totalValue) : seedPositionsForAccount(accountId, totalValue)
}

/** The account's cash as the book stands: its CASH position, which is the fixture `cashBalance` until a fill moves it. */
export function cashBalanceOf(account: Pick<Account, 'id' | 'totalValue' | 'cashBalance'>): number {
  return getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === 'CASH')?.marketValue ?? account.cashBalance
}
```

`src/mocks/data/realised-sales.ts`: add `import { recordedSales } from './portfolio-ledger'`; add to `RealisedSale`, after `holdingPeriod`:

```ts
  /** ≤ 0: the part of a loss §1091 washed when the sale was made; it is not recognised on the return. */
  washedLoss?: number
```

add after the `realisedSales` array:

```ts
/** Every realised sale: the fixtures' trailing quarter, then the sales the session's fills recorded. */
export function allRealisedSales(): RealisedSale[] {
  return [...realisedSales, ...recordedSales()]
}
```

and in `openWashSaleWindows` replace `return realisedSales` with `return allRealisedSales()`.

`src/mocks/handlers/custodian.ts`: import `cashBalanceOf, seedPositionsForAccount` from `'../data/positions'` and `bookOf, ledgerFills` from `'../data/portfolio-ledger'`.

- Extract the window map from `generateTaxLots` into:

```ts
/**
 * C12 · tax-loss-harvesting — the last day each symbol may not be bought back, for the account's
 * wash-sale taxpayer (`openWashSaleWindowsFor`), IRAs and Roths included. Windows arrive sorted by
 * `end`, so the last one written per symbol is the latest to close. An account that can't be
 * resolved restricts nothing.
 */
function repurchaseBlocksFor(accountId: string): Map<string, string> {
  const account = accounts.find((a) => a.id === accountId)
  return new Map(account ? openWashSaleWindowsFor(account, MOCK_TODAY_ISO).map((w) => [w.symbol, w.end]) : [])
}
```

- Rename the existing `generateTaxLots` to `seedTaxLots` (doc: "The fixtures' lots, partitioning each fixture position: the book before the session moved it."); inside it replace `getPositionsForAccount(accountId, totalValue)` with `seedPositionsForAccount(accountId, totalValue)` and replace the `account`/`repurchaseBlockedUntil` lines with `const repurchaseBlockedUntil = repurchaseBlocksFor(accountId)`. Then add:

```ts
/** The account's lots as they stand: the ledger's once the session has moved the account, else the fixtures'. */
export function generateTaxLots(accountId: string, totalValue: number): CustodianLot[] {
  const moved = bookOf(accountId)
  if (!moved) return seedTaxLots(accountId, totalValue)
  const blocked = repurchaseBlocksFor(accountId)
  const symbolOf = new Map(moved.positions.map((p) => [p.id, p.symbol]))
  return moved.lots.map((lot) => ({ ...lot, repurchaseBlockedUntil: blocked.get(symbolOf.get(lot.positionId) ?? '') ?? null }))
}
```

- In `generateTransactions`: `const held = seedPositionsForAccount(accountId, totalValue).filter((p) => p.symbol !== 'CASH')` and `generateTaxLots(accountId, totalValue)` → `seedTaxLots(accountId, totalValue)` (the history is the fixtures'; the opening balances reconcile to the seed book). Before the final `return`, append the fills:

```ts
  // The session's fills follow the fixture history, as the custodian would report them.
  for (const fill of ledgerFills().filter((f) => f.accountId === accountId)) {
    txns.push({
      id: `txn-${fill.id}`, accountId, date: fill.at, type: fill.side, symbol: fill.symbol,
      description: `${fill.side === 'buy' ? 'Bought' : 'Sold'} ${fill.quantity.toLocaleString()} shares ${fill.symbol}`,
      amount: fill.side === 'buy' ? -fill.value : fill.value, quantity: fill.quantity, price: fill.price,
    })
  }
```

- In the handlers: add `const withBookCash = (a: Account): Account => ({ ...a, cashBalance: cashBalanceOf(a) })`; `/api/custodian/accounts` returns `filtered.map(withBookCash)`; `/api/custodian/accounts/:accountId` returns `withBookCash(account)`; `/balances` returns `cashBalance: cashBalanceOf(account)`.

`src/mocks/handlers/tax-return.ts`: import `allRealisedSales` instead of `realisedSales`; in `ytdRealisedOnReturn` reduce over `allRealisedSales()` and convert the recognised result:

```ts
    const usd = toUSD(sale.realisedGainLoss - (sale.washedLoss ?? 0), currencyOf(account))
```

`src/mocks/handlers/compliance.ts`: import `cashBalanceOf` from `'../data/positions'`; in `evaluateProposal`, immediately before `const minimumCash = accountValue * CASH_MINIMUM_PCT`, add `const startingCash = cashBalanceOf(account)` and replace every `account.cashBalance` below it in that function (six uses: the running `cash`, `preExisting`, `currentWeight`, `cashNow`, `rose`, `fell`) with `startingCash`.

`src/mocks/handlers/oms.ts`: import `cashBalanceOf` alongside `getPositionsForAccount` and use `const postTradeCash = cashBalanceOf(account) - estValue` in the single-order cash check. `src/mocks/handlers/ai.ts`: import `cashBalanceOf` from `'../data/positions'`; the briefing's Cash metric is `formatAUM(cashBalanceOf(account))`. `src/mocks/data/nbas.ts`: import `allRealisedSales` instead of `realisedSales`; `sales: allRealisedSales().filter((r) => r.accountId === account.id && r.symbol === 'INTC')`.

`src/mocks/workspace/run-key.ts`:

```ts
import type { AgentId, Subject } from '@/types/workspace'
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { MOCK_NOW_ISO } from '@/lib/clock'

/**
 * One agent run: the same agent, thread, subject and as-of always find the same thing — until the
 * session's fills move the book, when a run measures the new book and is a new run.
 */
export const runKeyOf = (agentId: AgentId, threadId: string, subject: Subject): string => {
  const book = bookVersion()
  return `${agentId}|${threadId}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}${book > 0 ? `|book ${book}` : ''}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/data/__tests__/portfolio-ledger-reads.test.ts src/mocks/data/__tests__ src/mocks/handlers/__tests__/tax-netting-invariants.test.ts src/mocks/handlers/__tests__/loss-sale-window.test.ts src/mocks/handlers/__tests__/self-wash-substitution.test.ts --testTimeout 30000`
Expected: PASS (the fixture invariants still hold: nothing has moved). Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/mocks/data src/mocks/handlers src/mocks/workspace/run-key.ts
git commit -m "feat(ledger): every engine read of positions, lots, sales and cash goes through the session ledger

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The fills engine and the whole-book release

Released orders fill at the frozen day's prices inside the NYSE session and move the account's book in the ledger: a sell consumes the lots the approved version names (specific identification as approved; for an account whose sales are not taxed, its lots in sale order) and, in a taxable account, records realised sales by holding period that open recorded windows; a buy opens a lot dated the fill day at the fill price; cash moves by the fill values. The invariants are asserted, and a release of every account's approvable proposal holds them.

**Rulings this task carries:**
- A held position fills at its own mark (market value ÷ quantity), which is its price wherever the statement prices it exactly (every explicit fixture); a security the account does not hold fills at its quote in the account's currency (`usdQuoteFor`, the engine's own unit price). A whole-position sale fills at the position's whole market value, so it leaves nothing behind.
- A taxable sell records one realised sale per holding period it touches; proceeds split by shares, basis from the lots, the result rounded to whole dollars. It carries the version's settled `washedLoss` for that period, and names as its replacement the security a harvest substitution bought in its place (Task 9) — no other buy is "the replacement". A sale in an account whose sales are not taxed records no realised sale.
- Sells fill before buys, each in the version's order. A fill outside the session throws.

**Files:**
- Create: `src/mocks/workspace/fills.ts`
- Modify: `src/mocks/handlers/pms.ts` (quotes carry the asset class)
- Test: `src/mocks/workspace/__tests__/fills.test.ts`, `src/mocks/workspace/__tests__/whole-book-release.test.ts`

**Interfaces:**
- Consumes: `bookOf`, `commitMove`, `nextLedgerNumber`, `AccountBook`, `LedgerLot` (Task 1); `seedPositionsForAccount` (Task 2); `seedTaxLots` (Task 2); `realisedSales`, `RealisedSale` (with `washedLoss`); `currencyForAccount` from `@/mocks/handlers/oms`; `usdQuoteFor` from `@/mocks/handlers/pms`.
- Produces:

```ts
// src/mocks/handlers/pms.ts
export function usdQuoteFor(symbol: string): { name: string; price: number; assetClass: AssetClass } | undefined

// src/mocks/workspace/fills.ts
export class LedgerInvariantError extends Error {}
export type FillInput = { accountId: string; proposalId: string; version: ProposalVersion; orders: readonly StagedOrder[]; times: readonly string[] }
/** Applies the orders (`times[i]` is order i's fill time) and commits the move; returns the fills in execution order. Throws LedgerInvariantError, committing nothing, when an invariant would break. */
export function applyFills(input: FillInput): Fill[]
```

Ids: fills `fill-0001` …; recorded sales continue the fixtures' numbering (`rs-006` after `rs-001`…`rs-005`); a new position is `pos-<accountId>-<symbol>` (`pos-acc-002-VWO`); a bought lot is `lot-<positionId>-<fillId>` (`lot-pos-022-fill-0002`).

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/fills.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { bookVersion, recordedSales } from '@/mocks/data/portfolio-ledger'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { eventTime } from '@/lib/clock'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { applyFills, LedgerInvariantError } from '../fills'
import { buildVersion } from '../proposal-engine'
import { AGENT_CONSTRAINTS, versionOf } from './proposal-fixture'

const acc002 = accounts.find((a) => a.id === 'acc-002')!
/** The story's v3: harvest only, QAI excluded on the workbench. */
const v3 = () => versionOf(3, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }], [{ kind: 'exclude', symbol: 'QAI' }])
const staged = (v: ProposalVersion, accountId = 'acc-002'): StagedOrder[] => v.preview.trades.map((t, i) => ({
  id: `stg-${String(i + 1).padStart(4, '0')}`, proposalId: 'prop-0001', version: v.n, accountId, symbol: t.symbol, side: t.side,
  quantity: t.quantity, estimatedValue: t.estimatedValue, currency: t.currency, status: 'pending_compliance', stagedAt: eventTime(10), approvalActId: 'REC-0001',
}))
/** In session: the open is sequence 150 (14:30Z). */
const inSession = (n: number) => Array.from({ length: n }, (_, i) => eventTime(150 + i))
const fill = (v: ProposalVersion, accountId = 'acc-002') => {
  const orders = staged(v, accountId)
  return applyFills({ accountId, proposalId: 'prop-0001', version: v, orders, times: inSession(orders.length) })
}
const position = (symbol: string) => getPositionsForAccount('acc-002', acc002.totalValue).find((p) => p.symbol === symbol)
/** v1 of any account, through the same engine as `versionOf`. */
function versionFor(accountId: string): ProposalVersion {
  const r = buildVersion(accountId, AGENT_CONSTRAINTS, [])
  if (!r.ok) throw new Error(r.message)
  return { n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: eventTime(5), constraints: AGENT_CONSTRAINTS, edits: [], changeSummary: 'x', ...r.built }
}

describe('fills for the story\'s v3', () => {
  it('fill at the day\'s prices, sells first, in session', () => {
    const fills = fill(v3())
    expect(fills.map((f) => [f.id, f.symbol, f.side, f.quantity, f.value, f.at])).toEqual([
      ['fill-0001', 'INTC', 'sell', 7000, 199_150, '2026-02-25T14:30:00.000Z'],
      ['fill-0002', 'EFA', 'buy', 1118, 92_011.4, '2026-02-25T14:31:00.000Z'],
      ['fill-0003', 'VWO', 'buy', 1388, 62_182.4, '2026-02-25T14:32:00.000Z'],
      ['fill-0004', 'AGG', 'buy', 490, 48_265, '2026-02-25T14:33:00.000Z'],
      ['fill-0005', 'GLD', 'buy', 115, 24_794, '2026-02-25T14:34:00.000Z'],
    ])
    expect(fills.map((f) => f.price)).toEqual([expect.closeTo(28.45, 8), expect.closeTo(82.3, 8), expect.closeTo(44.8, 8), expect.closeTo(98.5, 8), expect.closeTo(215.6, 8)])
    expect(bookVersion()).toBe(1)
  })

  it('moves the book: INTC gone, two positions opened, cash moved by the fill values, the account value unchanged', () => {
    fill(v3())
    expect(position('INTC')).toBeUndefined()
    expect(position('EFA')).toMatchObject({ quantity: 5276, marketValue: 434_214.8 })
    expect(position('AGG')).toMatchObject({ quantity: 5572, marketValue: 548_842 })
    expect(position('VWO')).toMatchObject({ id: 'pos-acc-002-VWO', assetClass: 'emerging_markets', quantity: 1388, marketValue: 62_182.4, costBasis: 62_182.4, gainLoss: 0 })
    expect(position('GLD')).toMatchObject({ id: 'pos-acc-002-GLD', assetClass: 'commodities', quantity: 115, marketValue: 24_794 })
    expect(position('CASH')?.marketValue).toBeCloseTo(197_401.2, 2)
    const total = getPositionsForAccount('acc-002', acc002.totalValue).reduce((s, p) => s + p.marketValue, 0)
    expect(total).toBeCloseTo(acc002.totalValue, 2)
  })

  it('consumes the INTC lot and opens one lot per buy, dated the fill day, short-term, at cost', () => {
    fill(v3())
    const lots = generateTaxLots('acc-002', acc002.totalValue)
    expect(lots.some((l) => l.id === 'lot-pos-023-0')).toBe(false)
    expect(lots.find((l) => l.id === 'lot-pos-022-fill-0002')).toMatchObject({ positionId: 'pos-022', purchaseDate: '2026-02-25', quantity: 1118, costBasis: 92_011.4, holdingPeriod: 'short' })
    expect(lots.find((l) => l.id === 'lot-pos-acc-002-VWO-fill-0003')).toMatchObject({ positionId: 'pos-acc-002-VWO', quantity: 1388, gainLoss: 0 })
  })

  it('records the INTC sale as realised long-term, opening its recorded window', () => {
    fill(v3())
    expect(recordedSales()).toEqual([{
      id: 'rs-006', accountId: 'acc-002', householdId: 'hh-001', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-25',
      quantity: 7000, proceeds: 199_150, costBasis: 245_000, realisedGainLoss: -45_850, holdingPeriod: 'long',
    }])
  })

  it('names the harvest substitute as the replacement, and carries a washed part', () => {
    const base = v3()
    const named: ProposalVersion = {
      ...base,
      harvestSubstitutions: [{ assetClass: 'us_equity', foreclosed: { symbol: 'INTC', name: 'Intel Corp.' }, bought: { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' }, harvested: true }],
      preview: { ...base.preview, trades: base.preview.trades.map((t) => (t.symbol === 'INTC' ? { ...t, washedLoss: { shortTerm: 0, longTerm: -10_000, collectibleLongTerm: 0 } } : t)) },
    }
    fill(named)
    expect(recordedSales()[0]).toMatchObject({ replacementSymbol: 'VTI', washedLoss: -10_000 })
  })
})

describe('partial and fractional sells (v1)', () => {
  it('a partial sale shrinks its lot; a fractional whole-position sale removes the position and every lot', () => {
    const v1 = versionOf(1, AGENT_CONSTRAINTS)
    const spyTake = v1.legFacts.find((f) => f.symbol === 'SPY')!.lots[0]!
    const before = generateTaxLots('acc-002', acc002.totalValue).find((l) => l.id === spyTake.lotId)!
    fill(v1)
    const lots = generateTaxLots('acc-002', acc002.totalValue)
    const after = lots.find((l) => l.id === spyTake.lotId)!
    expect(after.quantity).toBeCloseTo(before.quantity - spyTake.shares, 6)
    expect(after.costBasis).toBeCloseTo(before.costBasis * (after.quantity / before.quantity), 1)
    expect(position('SPY')?.quantity).toBe(3879 - 758)
    expect(lots.filter((l) => l.positionId === 'pos-020').reduce((s, l) => s + l.quantity, 0)).toBeCloseTo(3879 - 758, 6)
    expect(position('IBIT')).toBeUndefined()
    expect(lots.some((l) => l.positionId === 'pos-026')).toBe(false)
  })
})

describe('the invariants hold or nothing is committed', () => {
  it('a second application of the same orders sells nothing twice', () => {
    const v = v3()
    fill(v)
    expect(() => fill(v)).toThrow(LedgerInvariantError)
    expect(bookVersion()).toBe(1)
  })

  it('a fill outside the session is refused', () => {
    const v = v3()
    const orders = staged(v)
    expect(() => applyFills({ accountId: 'acc-002', proposalId: 'prop-0001', version: v, orders, times: orders.map((_, i) => eventTime(30 + i)) })).toThrow(LedgerInvariantError)
    expect(bookVersion()).toBe(0)
    expect(position('INTC')?.quantity).toBe(7000)
  })

  it('an account whose sales are not taxed records no realised sale but still consumes its lots', () => {
    const candidate = accounts.filter((a) => !isTaxableAccount(a.taxTreatment))
      .map((account) => ({ account, v: versionFor(account.id) }))
      .find(({ v }) => v.preview.trades.some((t) => t.side === 'sell') && !v.pretrade.violations.some((x) => x.severity === 'block'))
    expect(candidate).toBeDefined()
    const { account, v } = candidate!
    const sell = v.preview.trades.find((t) => t.side === 'sell')!
    const sold = v.legFacts.find((f) => f.symbol === sell.symbol)!
    const held = (lots: { id: string; quantity: number }[]) => lots.filter((l) => sold.lotIds.includes(l.id)).reduce((s, l) => s + l.quantity, 0)
    const before = held(generateTaxLots(account.id, account.totalValue))
    fill(v, account.id)
    expect(recordedSales()).toEqual([])
    expect(held(generateTaxLots(account.id, account.totalValue))).toBeCloseTo(before - sell.quantity, 6)
  })
})
```

Create `src/mocks/workspace/__tests__/whole-book-release.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { cashBalanceOf, getPositionsForAccount } from '@/mocks/data/positions'
import { generateTaxLots } from '@/mocks/handlers/custodian'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { agentConstraints } from '@/mocks/agents/proposal-agent'
import { eventTime } from '@/lib/clock'
import { buildVersion } from '../proposal-engine'
import { applyFills } from '../fills'

const approvable = (v: ProposalVersion) => v.preview.trades.length > 0 && !v.pretrade.violations.some((x) => x.severity === 'block')

describe('releasing every account\'s approvable proposal, one after another', () => {
  it('leaves no negative or empty position, no lot sold twice, cash and quantities reconciled, drift from the new holdings', () => {
    const constraints = agentConstraints([])
    let released = 0
    for (const account of accounts) {
      const built = buildVersion(account.id, constraints, [])
      if (!built.ok) throw new Error(`${account.id}: ${built.message}`)
      const version: ProposalVersion = { n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: eventTime(5), constraints, edits: [], changeSummary: 'x', ...built.built }
      if (!approvable(version)) continue
      const orders: StagedOrder[] = version.preview.trades.map((t, i) => ({
        id: `stg-${account.id}-${i}`, proposalId: `prop-${account.id}`, version: 1, accountId: account.id, symbol: t.symbol, side: t.side,
        quantity: t.quantity, estimatedValue: t.estimatedValue, currency: t.currency, status: 'pending_compliance', stagedAt: eventTime(10), approvalActId: `REC-${account.id}`,
      }))
      const cashBefore = cashBalanceOf(account)
      const fills = applyFills({ accountId: account.id, proposalId: `prop-${account.id}`, version, orders, times: orders.map((_, i) => eventTime(150 + i)) })
      released += 1

      const positions = getPositionsForAccount(account.id, account.totalValue)
      const lots = generateTaxLots(account.id, account.totalValue)
      for (const p of positions) {
        expect(p.quantity, `${account.id} ${p.symbol}`).toBeGreaterThan(0)
        expect(p.marketValue, `${account.id} ${p.symbol}`).toBeGreaterThanOrEqual(0)
        if (p.symbol === 'CASH') continue
        const own = lots.filter((l) => l.positionId === p.id)
        expect(own.reduce((s, l) => s + l.quantity, 0), `${account.id} ${p.symbol} lots`).toBeCloseTo(p.quantity, 6)
        expect(own.reduce((s, l) => s + l.currentValue, 0), `${account.id} ${p.symbol} lot values`).toBeCloseTo(p.marketValue, 1)
      }
      expect(lots.every((l) => positions.some((p) => p.id === l.positionId)), account.id).toBe(true)
      expect(fills.map((f) => [f.symbol, f.side, f.quantity])).toEqual([...orders].sort((a, b) => Number(a.side === 'buy') - Number(b.side === 'buy')).map((o) => [o.symbol, o.side, o.quantity]))
      const moved = fills.reduce((s, f) => s + (f.side === 'sell' ? f.value : -f.value), 0)
      expect(cashBalanceOf(account), `${account.id} cash`).toBeCloseTo(cashBefore + moved, 2)
      expect(positions.reduce((s, p) => s + p.marketValue, 0), `${account.id} value`).toBeCloseTo(account.totalValue, 1)
      const after = new Map(computeDriftForAccount(account).assetClassDrifts.map((d) => [d.assetClass, d.drift]))
      for (const d of version.preview.projectedDrift.assetClassDrifts) {
        expect(Math.abs((after.get(d.assetClass) ?? 0) - d.drift), `${account.id} ${d.assetClass} drift`).toBeLessThan(0.0005)
      }
    }
    expect(released).toBeGreaterThan(20)
    const ids = accounts.flatMap((a) => generateTaxLots(a.id, a.totalValue).map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  }, 180_000)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/fills.test.ts src/mocks/workspace/__tests__/whole-book-release.test.ts --testTimeout 30000`
Expected: FAIL — `../fills` does not exist.

- [ ] **Step 3: Quotes carry the asset class**

In `src/mocks/handlers/pms.ts`, import `AssetClass` from `@/types/portfolio` and make `USD_SECURITY_QUOTES` a `ReadonlyMap<string, { name: string; price: number; assetClass: AssetClass }>`, setting `quotes.set(position.symbol, { name: position.name, price: position.price, assetClass: position.assetClass })`; `usdQuoteFor` returns that type. `modelImplementationSecurity` keeps returning `{ symbol, name, price }`.

- [ ] **Step 4: Write the fills engine**

Create `src/mocks/workspace/fills.ts`:

```ts
import type { Account } from '@/types/account'
import type { PositionSeed } from '@/types/portfolio'
import type { Fill, ProposalVersion, StagedOrder } from '@/types/workspace-proposal'
import type { ProposedTrade } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { seedPositionsForAccount } from '@/mocks/data/positions'
import { realisedSales, type RealisedSale } from '@/mocks/data/realised-sales'
import { bookOf, commitMove, nextLedgerNumber, type AccountBook, type LedgerLot } from '@/mocks/data/portfolio-ledger'
import { seedTaxLots } from '@/mocks/handlers/custodian'
import { currencyForAccount } from '@/mocks/handlers/oms'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { convertCurrency } from '@/lib/currency'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { isDuringNyseSession } from '@/lib/trading-calendar'

/** A fill that would break the ledger's invariants. Nothing is committed when one is thrown. */
export class LedgerInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerInvariantError'
  }
}

const EPSILON = 1e-6
const cents = (v: number) => Math.round(v * 100) / 100
const pad4 = (n: number) => String(n).padStart(4, '0')

export type FillInput = { accountId: string; proposalId: string; version: ProposalVersion; orders: readonly StagedOrder[]; times: readonly string[] }

type Take = { lotId: string; shares: number }
type Taken = Take & { lot: LedgerLot }

/** The account's book to move: the ledger's if the session has moved it, else the fixtures', copied. */
function bookToMove(account: Account): AccountBook {
  const moved = bookOf(account.id)
  if (moved) return { positions: moved.positions.map((p) => ({ ...p })), lots: moved.lots.map((l) => ({ ...l })) }
  return {
    positions: seedPositionsForAccount(account.id, account.totalValue).map(({ weight: _weight, ...seed }) => seed),
    lots: seedTaxLots(account.id, account.totalValue).map(({ repurchaseBlockedUntil: _until, ...lot }) => lot),
  }
}

/** A held position fills at its own mark (value per unit); anything else at its quote in the account's currency. */
function unitPrice(account: Account, held: PositionSeed | undefined, symbol: string): number {
  if (held && held.quantity > 0) return held.marketValue / held.quantity
  const quote = usdQuoteFor(symbol)
  if (!quote) throw new LedgerInvariantError(`There is no quote to fill ${symbol} in ${account.id}`)
  return convertCurrency(quote.price, 'USD', currencyForAccount(account.id), FX_RATES_USD_BASE)
}

/** The lots a sell consumes: the approved version's specific identification when it names shares, else its lots in sale order. */
function takesFor(version: ProposalVersion, symbol: string, quantity: number, lots: readonly LedgerLot[]): Take[] {
  const facts = version.legFacts.find((f) => f.symbol === symbol)
  if (!facts) throw new LedgerInvariantError(`v${version.n} records no lots for its ${symbol} sale`)
  if (facts.lots.length > 0) return facts.lots.map((t) => ({ lotId: t.lotId, shares: t.shares }))
  let left = quantity
  return facts.lotIds.flatMap((lotId) => {
    if (left <= EPSILON) return []
    const lot = lots.find((l) => l.id === lotId)
    if (!lot) throw new LedgerInvariantError(`Lot ${lotId} was already consumed`)
    const shares = Math.min(left, lot.quantity)
    left -= shares
    return [{ lotId, shares }]
  })
}

/** Takes the shares from their lots: a lot emptied leaves the book, a lot partly taken keeps its basis pro rata. */
function consume(lots: readonly LedgerLot[], takes: readonly Take[], quantity: number, symbol: string): { lots: LedgerLot[]; taken: Taken[] } {
  const total = takes.reduce((s, t) => s + t.shares, 0)
  if (Math.abs(total - quantity) > EPSILON) throw new LedgerInvariantError(`The ${symbol} lots give ${total} shares for a ${quantity}-share fill`)
  const seen = new Set<string>()
  let next = [...lots]
  const taken = takes.map((t): Taken => {
    if (seen.has(t.lotId)) throw new LedgerInvariantError(`Lot ${t.lotId} is taken twice by one fill`)
    seen.add(t.lotId)
    const lot = next.find((l) => l.id === t.lotId)
    if (!lot) throw new LedgerInvariantError(`Lot ${t.lotId} was already consumed`)
    const remaining = lot.quantity - t.shares
    if (remaining < -EPSILON) throw new LedgerInvariantError(`Lot ${t.lotId} holds ${lot.quantity} shares; the fill takes ${t.shares}`)
    next = remaining <= EPSILON
      ? next.filter((l) => l.id !== lot.id)
      : next.map((l) => (l.id === lot.id ? { ...l, quantity: remaining, costBasis: cents(l.costBasis * (remaining / l.quantity)) } : l))
    return { ...t, lot }
  })
  return { lots: next, taken }
}

/** A position restated from its lots at a new value; its lots re-marked so their values sum to it. */
function restate(position: PositionSeed, lots: readonly LedgerLot[], quantity: number, marketValue: number): { position: PositionSeed; lots: LedgerLot[] } {
  const own = lots.filter((l) => l.positionId === position.id)
  const inLots = own.reduce((s, l) => s + l.quantity, 0)
  if (Math.abs(inLots - quantity) > EPSILON) throw new LedgerInvariantError(`${position.symbol}: the lots hold ${inLots} against a ${quantity} position`)
  const value = cents(marketValue)
  let allocated = 0
  const marked = new Map(own.map((l, i) => {
    const currentValue = i === own.length - 1 ? cents(value - allocated) : cents(value * (l.quantity / quantity))
    allocated += currentValue
    return [l.id, { ...l, currentValue, gainLoss: cents(currentValue - l.costBasis) }]
  }))
  const costBasis = cents(own.reduce((s, l) => s + l.costBasis, 0))
  const gainLoss = cents(value - costBasis)
  return {
    position: { ...position, quantity, marketValue: value, costBasis, gainLoss, gainLossPercent: costBasis > 0 ? gainLoss / costBasis : 0 },
    lots: lots.map((l) => marked.get(l.id) ?? l),
  }
}

function moveCash(positions: readonly PositionSeed[], delta: number): PositionSeed[] {
  return positions.map((p) => {
    if (p.symbol !== 'CASH') return p
    const value = cents(p.marketValue + delta)
    return { ...p, price: value, marketValue: value, costBasis: value, gainLoss: 0, gainLossPercent: 0 }
  })
}

/** One realised sale per holding period the sale touches; none in an account whose sales are not taxed. */
function realisedSalesOf(account: Account, fill: Fill, taken: readonly Taken[], trade: ProposedTrade, replacement: string | undefined): RealisedSale[] {
  if (!isTaxableAccount(account.taxTreatment)) return []
  const groups = (['short', 'long'] as const)
    .map((period) => ({ period, takes: taken.filter((t) => t.lot.holdingPeriod === period) }))
    .filter((g) => g.takes.length > 0)
  let proceedsLeft = fill.value
  return groups.map((g, i): RealisedSale => {
    const shares = g.takes.reduce((s, t) => s + t.shares, 0)
    const proceeds = i === groups.length - 1 ? cents(proceedsLeft) : cents(fill.value * (shares / fill.quantity))
    proceedsLeft -= proceeds
    const costBasis = cents(g.takes.reduce((s, t) => s + t.lot.costBasis * (t.shares / t.lot.quantity), 0))
    const realisedGainLoss = Math.round(proceeds - costBasis)
    const washed = g.period === 'short' ? trade.washedLoss?.shortTerm ?? 0 : trade.washedLoss?.longTerm ?? 0
    return {
      id: `rs-${String(realisedSales.length + nextLedgerNumber('sale')).padStart(3, '0')}`,
      accountId: account.id, householdId: account.householdId, symbol: fill.symbol, name: fill.name, saleDate: fill.at.slice(0, 10),
      quantity: shares, proceeds, costBasis, realisedGainLoss, holdingPeriod: g.period,
      ...(washed < 0 ? { washedLoss: washed } : {}),
      ...(replacement !== undefined && realisedGainLoss < 0 ? { replacementSymbol: replacement } : {}),
    }
  })
}

/**
 * Phase 4 · released orders fill at the frozen day's prices and move the account's book. Sells
 * settle first, then buys, each in the version's order. The move is committed whole, or — when any
 * invariant would break (a lot consumed twice, a share count that does not reconcile, a fill outside
 * the NYSE session) — not at all.
 */
export function applyFills({ accountId, proposalId, version, orders, times }: FillInput): Fill[] {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new LedgerInvariantError(`There is no account ${accountId}`)
  if (times.length !== orders.length) throw new LedgerInvariantError(`${orders.length} orders were given ${times.length} fill times`)
  const outside = times.find((at) => !isDuringNyseSession(at))
  if (outside) throw new LedgerInvariantError(`A fill at ${outside} is outside the NYSE session`)
  const sequence = [...orders].sort((a, b) => Number(a.side === 'buy') - Number(b.side === 'buy'))
  let { positions, lots } = bookToMove(account)
  const valueBefore = positions.reduce((s, p) => s + p.marketValue, 0)
  const fills: Fill[] = []
  const sales: RealisedSale[] = []

  sequence.forEach((order, i) => {
    const at = times[i]
    if (at === undefined) throw new LedgerInvariantError(`No fill time for ${order.id}`)
    const trade = version.preview.trades.find((t) => t.symbol === order.symbol && t.side === order.side)
    if (!trade) throw new LedgerInvariantError(`${order.id} is not a leg of v${version.n}`)
    const held = positions.find((p) => p.symbol === order.symbol && p.symbol !== 'CASH')
    const price = unitPrice(account, held, order.symbol)
    const base = { id: `fill-${pad4(nextLedgerNumber('fill'))}`, stagedOrderId: order.id, proposalId, version: version.n, accountId, symbol: order.symbol, name: trade.name, quantity: order.quantity, price, currency: order.currency, at }

    if (order.side === 'sell') {
      if (!held) throw new LedgerInvariantError(`${accountId} sells ${order.symbol} but holds none`)
      if (order.quantity > held.quantity + EPSILON) throw new LedgerInvariantError(`${accountId} sells ${order.quantity} ${order.symbol} but holds ${held.quantity}`)
      const whole = Math.abs(order.quantity - held.quantity) <= EPSILON
      const fill: Fill = { ...base, side: 'sell', value: whole ? held.marketValue : cents(order.quantity * price) }
      const consumed = consume(lots, takesFor(version, order.symbol, order.quantity, lots), order.quantity, order.symbol)
      lots = consumed.lots
      if (whole) {
        if (lots.some((l) => l.positionId === held.id)) throw new LedgerInvariantError(`${order.symbol} was sold whole but lots remain`)
        positions = positions.filter((p) => p.id !== held.id)
      } else {
        const restated = restate(held, lots, held.quantity - order.quantity, held.marketValue - fill.value)
        positions = positions.map((p) => (p.id === held.id ? restated.position : p))
        lots = restated.lots
      }
      const replacement = version.harvestSubstitutions.find((s) => s.harvested && s.foreclosed.symbol === order.symbol)?.bought.symbol
      sales.push(...realisedSalesOf(account, fill, consumed.taken, trade, replacement))
      positions = moveCash(positions, fill.value)
      fills.push(fill)
      return
    }

    const fill: Fill = { ...base, side: 'buy', value: cents(order.quantity * price) }
    const assetClass = held?.assetClass ?? usdQuoteFor(order.symbol)?.assetClass
    if (!assetClass) throw new LedgerInvariantError(`There is no asset class for ${order.symbol}`)
    const position: PositionSeed = held ?? {
      id: `pos-${accountId}-${order.symbol}`, accountId, symbol: order.symbol, name: trade.name, assetClass,
      quantity: 0, price, costBasis: 0, marketValue: 0, gainLoss: 0, gainLossPercent: 0,
    }
    lots = [...lots, {
      id: `lot-${position.id}-${fill.id}`, positionId: position.id, purchaseDate: at.slice(0, 10), quantity: order.quantity,
      costBasis: fill.value, currentValue: fill.value, gainLoss: 0, holdingPeriod: 'short',
    }]
    const restated = restate(position, lots, position.quantity + order.quantity, position.marketValue + fill.value)
    lots = restated.lots
    positions = held
      ? positions.map((p) => (p.id === held.id ? restated.position : p))
      : [...positions.filter((p) => p.symbol !== 'CASH'), restated.position, ...positions.filter((p) => p.symbol === 'CASH')]
    positions = moveCash(positions, -fill.value)
    fills.push(fill)
  })

  const valueAfter = positions.reduce((s, p) => s + p.marketValue, 0)
  if (Math.abs(valueAfter - valueBefore) > 0.01 * Math.max(1, fills.length)) {
    throw new LedgerInvariantError(`${accountId}'s value moved from ${valueBefore} to ${valueAfter}; fills move money between holdings, never in or out`)
  }
  const ids = lots.map((l) => l.id)
  if (new Set(ids).size !== ids.length) throw new LedgerInvariantError(`${accountId} holds a lot twice`)
  commitMove(accountId, { positions, lots }, sales, fills)
  return fills
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/fills.test.ts src/mocks/workspace/__tests__/whole-book-release.test.ts --testTimeout 30000`
Expected: PASS. If the whole-book test reports an account whose drift strays from its projection by more than 0.0005, print that account's fills against its legs before changing anything: the projection and the fills use the same prices, so a stray is a defect, not a tolerance to widen. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/workspace/fills.ts src/mocks/handlers/pms.ts src/mocks/workspace/__tests__/fills.test.ts src/mocks/workspace/__tests__/whole-book-release.test.ts
git commit -m "feat(ledger): fills at the day's prices move the book, invariants asserted; the whole book releases cleanly

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Orders acts — release, return to advisor, escalate

Mark's three acts on staged orders. A release needs the active approval with that act id and its fingerprint; it records the act and its marker in the team thread, fills every pending order inside the session (at the open when released before it), closes the approval as `released`, and posts the fills message. A filled proposal is closed; asking the Proposal Agent again drafts a new proposal from the moved book.

**Rulings this task carries:**
- Order of checks: not visible (client, unknown) `404` → not compliance `403` → rationale `400` → approval state `409` (`NOT_THIS_APPROVAL`, `APPROVAL_WITHDRAWN`, `APPROVAL_SUPERSEDED`, `APPROVAL_RETURNED`, `ALREADY_RELEASED`, `FINGERPRINT_MISMATCH`, `ALREADY_ESCALATED`, `MARKET_CLOSED`).
- Fill times: the act and its marker take the next two event-clock minutes; the fills take the following minutes but never before the session opens (`2026-02-25T14:30:00.000Z`), and the clock jumps there. A release whose fills would fall after the close is refused `409 MARKET_CLOSED` (unreachable in the demo; pinned by test). The fills message follows the last fill.
- Escalated orders stay pending and releasable; a second escalation is refused. A return withdraws the approval (`returned`) and returns the orders; the advisor may revise and approve again.
- A filled proposal refuses revise, save, preview and approve with `409 FILLED`. The next proposal for the same account in the thread is titled with its ordinal: "Johnson rebalance 2".

**Files:**
- Create: `src/mocks/workspace/compliance-acts.ts`, `src/mocks/workspace/__tests__/story-fixture.ts`
- Modify: `src/mocks/data/workspace-store.ts` (`advanceClockTo`), `src/mocks/data/proposals-store.ts` (`filledMessage`), `src/mocks/workspace/proposals.ts`, `src/mocks/workspace/proposal-acts.ts` (`approveProposal` refuses a filled proposal)
- Test: `src/mocks/workspace/__tests__/orders-acts.test.ts`, `src/mocks/workspace/__tests__/moved-book.test.ts`

**Interfaces:**
- Consumes: `applyFills` (Task 3); `recordAct`, `closeStaging`, `setApprovalStatus`, `visibleProposal` (Task 1 / Phase 3); `actOnApproval`, `releasedApproval` (Task 1).
- Produces:

```ts
// src/mocks/data/workspace-store.ts
export function advanceClockTo(sequence: number): void      // the event clock never runs backwards

// src/mocks/workspace/compliance-acts.ts
export type ComplianceFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type Recorded = { ok: true; act: BindingAct }
export type ActOptions = { viaPresenter?: ViaPresenter }
export const RATIONALE_MAX = 2000
export function rationaleRefusal(rationale: string): ComplianceFailure | undefined
export function releaseOrders(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options?: ActOptions): Recorded | ComplianceFailure
export function returnToAdvisor(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options?: ActOptions): Recorded | ComplianceFailure
export function escalate(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options?: ActOptions): Recorded | ComplianceFailure

// src/mocks/workspace/__tests__/story-fixture.ts (test helper, used by Tasks 4–8)
export const ADRIAN: 'user-001'; export const MARK: 'cco-001'; export const ROBERT: 'cli-001'
export const RATIONALE: string
export type Approved = { proposalId: string; version: number; approvalActId: string; fingerprint: string }
export function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }>
export function approvedV1(): Approved
export function approvedStoryV3(): Approved
export function release(a: Approved, rationale?: string): BindingAct
```

Act summaries, exactly: `Released the orders staged from v{n} of the {title}`; `Returned v{n} of the {title} to the advisor; the approval is withdrawn`; `Escalated the orders staged from v{n} of the {title}; they stay held`.

- [ ] **Step 1: Write the story fixture and the failing tests**

Create `src/mocks/workspace/__tests__/story-fixture.ts`:

```ts
import type { BindingAct } from '@/types/workspace'
import { createProposal, reviseProposal, saveVersion } from '../proposals'
import { approveProposal } from '../proposal-acts'
import { releaseOrders } from '../compliance-acts'

export const ADRIAN = 'user-001'
export const MARK = 'cco-001'
export const ROBERT = 'cli-001'
export const RATIONALE = 'Reviewed the approved version, its legs and its pre-trade reading.'

export type Approved = { proposalId: string; version: number; approvalActId: string; fingerprint: string }

/** The engine's answer when it must have succeeded; a refusal fails the test with its reason. */
export function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r)}`)
  return r as Extract<T, { ok: true }>
}

export function approvedV1(): Approved {
  const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
  const v1 = detail.versions[0]!
  const { act } = ok(approveProposal(ADRIAN, detail.id, 1, v1.fingerprint))
  return { proposalId: detail.id, version: 1, approvalActId: act.id, fingerprint: v1.fingerprint }
}

/** The Phase 3 story's approval: revised to harvest only, QAI excluded on the workbench, v3 approved. */
export function approvedStoryV3(): Approved {
  const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
  ok(reviseProposal(ADRIAN, detail.id, [{ kind: 'harvest_only' }]))
  const v3 = ok(saveVersion(ADRIAN, detail.id, [{ kind: 'exclude', symbol: 'QAI' }])).detail.versions[2]!
  const { act } = ok(approveProposal(ADRIAN, detail.id, 3, v3.fingerprint))
  return { proposalId: detail.id, version: 3, approvalActId: act.id, fingerprint: v3.fingerprint }
}

export function release(a: Approved, rationale = RATIONALE): BindingAct {
  return ok(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, rationale)).act
}
```

Create `src/mocks/workspace/__tests__/orders-acts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/workspace'
import { store } from '@/mocks/data/workspace-store'
import { approvalState, detailOf, proposalById } from '@/mocks/data/proposals-store'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { escalate, releaseOrders, returnToAdvisor } from '../compliance-acts'
import { approveProposal, withdrawApproval } from '../proposal-acts'
import { createProposal, previewEdits, reviseProposal, saveVersion } from '../proposals'
import { ADRIAN, MARK, RATIONALE, approvedStoryV3, approvedV1, ok, release } from './story-fixture'

const kinds = () => store().acts.map((a) => a.kind)

describe('release_orders: separation of duties and the rationale', () => {
  it('only compliance releases; a client is told the proposal does not exist; nothing is recorded or filled', () => {
    const a = approvedV1()
    for (const viewer of ['user-001', 'user-002', 'user-003']) {
      expect(releaseOrders(viewer, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    }
    expect(releaseOrders('cli-001', a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 404 })
    expect(releaseOrders(MARK, 'prop-9999', a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 404 })
    expect(kinds()).toEqual(['approve_proposal'])
    expect(ledgerFills()).toEqual([])
  })

  it('a rationale is required and bounded; it is recorded trimmed', () => {
    const a = approvedV1()
    for (const blank of ['', '   ', '\n\n\t']) {
      expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, blank)).toMatchObject({ ok: false, status: 400, code: 'RATIONALE_REQUIRED' })
    }
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'x'.repeat(2001))).toMatchObject({ ok: false, status: 400, code: 'RATIONALE_TOO_LONG' })
    expect(ok(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, `  ${RATIONALE}\n`)).act.rationale).toBe(RATIONALE)
  })
})

describe('release_orders needs the matching active approval', () => {
  it('refuses another approval id and other evidence', () => {
    const a = approvedV1()
    expect(releaseOrders(MARK, a.proposalId, 'REC-0999', a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'NOT_THIS_APPROVAL' })
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, 'DEADBEEF', RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
  })

  it('refuses an approval the advisor withdrew, saying so', () => {
    const a = approvedV1()
    ok(withdrawApproval(ADRIAN, a.proposalId))
    const r = releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)
    expect(r).toMatchObject({ ok: false, status: 409, code: 'APPROVAL_WITHDRAWN' })
    expect(r.ok ? '' : r.message).toBe('The approval of v1 (REC-0001) was withdrawn by the advisor; nothing from it can be released.')
    expect(ledgerFills()).toEqual([])
  })

  it('refuses an approval a newer approval superseded', () => {
    const a = approvedV1()
    const v2 = ok(reviseProposal(ADRIAN, a.proposalId, [{ kind: 'harvest_only' }])).detail.versions[1]!
    ok(approveProposal(ADRIAN, a.proposalId, 2, v2.fingerprint))
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'APPROVAL_SUPERSEDED' })
  })

  it('refuses after the session has closed, recording nothing', () => {
    const a = approvedV1()
    store().sequence = 600
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'MARKET_CLOSED' })
    expect(kinds()).toEqual(['approve_proposal'])
  })
})

describe("releasing the story's v3", () => {
  it('records one act and its marker, then fills at the open and posts the fills', () => {
    const a = approvedStoryV3()
    const act = release(a)
    expect(act).toEqual({
      id: 'REC-0002', kind: 'release_orders', actorId: MARK, at: act.at, threadId: 'th-johnson-review',
      subject: { type: 'proposal', id: a.proposalId }, version: 3, fingerprint: a.fingerprint,
      summary: 'Released the orders staged from v3 of the Johnson rebalance', rationale: RATIONALE, approvalActId: 'REC-0001',
    })
    expect(act.at < '2026-02-25T14:30:00.000Z').toBe(true)
    const thread = store().messages.filter((m) => m.threadId === 'th-johnson-review')
    const [marker, report] = thread.slice(-2) as [Message, Message]
    expect(marker).toMatchObject({ kind: 'act', actId: 'REC-0002' })
    if (report.kind !== 'fills') throw new Error('the fills message follows the release')
    expect(report).toMatchObject({ title: 'Johnson rebalance', version: 3, releaseActId: 'REC-0002', at: '2026-02-25T14:35:00.000Z' })
    expect(report.fills.map((f) => [f.symbol, f.at])).toEqual([
      ['INTC', '2026-02-25T14:30:00.000Z'], ['EFA', '2026-02-25T14:31:00.000Z'], ['VWO', '2026-02-25T14:32:00.000Z'],
      ['AGG', '2026-02-25T14:33:00.000Z'], ['GLD', '2026-02-25T14:34:00.000Z'],
    ])
  })

  it('closes every staged order as filled, naming the act and its fill, and reads as released', () => {
    const a = approvedStoryV3()
    const act = release(a)
    const staged = store().staged.filter((o) => o.approvalActId === a.approvalActId)
    expect(staged.every((o) => o.status === 'filled' && o.closedByActId === act.id && o.fillId?.startsWith('fill-'))).toBe(true)
    const proposal = proposalById(a.proposalId)!
    expect(approvalState(proposal)).toEqual({ kind: 'released', version: 3, latestVersion: 3, approverId: ADRIAN, actId: 'REC-0001', releaseActId: 'REC-0002' })
    expect(detailOf(proposal).fills).toHaveLength(5)
  })

  it('a second release, by anyone, is refused and nothing fills twice', () => {
    const a = approvedStoryV3()
    release(a)
    const again = releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)
    expect(again).toMatchObject({ ok: false, status: 409, code: 'ALREADY_RELEASED' })
    expect(again.ok ? '' : again.message).toContain('REC-0002')
    expect(kinds()).toEqual(['approve_proposal', 'release_orders'])
    expect(ledgerFills()).toHaveLength(5)
  })

  it('records a presenter shortcut as compliance, with the firm-only marker', () => {
    const a = approvedV1()
    const act = ok(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE, { viaPresenter: { presenterId: ADRIAN } })).act
    expect(act).toMatchObject({ actorId: MARK, viaPresenter: { presenterId: ADRIAN } })
  })

  it("leaves Robert's thread and records exactly as they were", () => {
    const a = approvedV1()
    const robert = () => JSON.stringify([store().messages.filter((m) => m.threadId === 'th-robert'), store().acts.filter((x) => x.threadId === 'th-robert')])
    const before = robert()
    release(a)
    expect(robert()).toBe(before)
  })
})

describe('a filled proposal is closed; the next one starts from the moved book', () => {
  it('refuses revise, save, preview and approve', () => {
    const a = approvedStoryV3()
    release(a)
    for (const r of [
      reviseProposal(ADRIAN, a.proposalId, []), saveVersion(ADRIAN, a.proposalId, [{ kind: 'exclude', symbol: 'AGG' }]),
      previewEdits(ADRIAN, a.proposalId, []), approveProposal(ADRIAN, a.proposalId, 3, a.fingerprint),
    ]) expect(r).toMatchObject({ ok: false, status: 409, code: 'FILLED' })
  })

  it('asking the Proposal Agent again drafts a second proposal from the new book', () => {
    const a = approvedStoryV3()
    release(a)
    const next = createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    if (!next.ok) throw new Error(next.message)
    expect(next).toMatchObject({ created: true, detail: { id: 'prop-0002', title: 'Johnson rebalance 2' } })
    const v1 = next.detail.versions[0]!
    expect(v1.preview.trades.some((t) => t.symbol === 'INTC')).toBe(false)
    expect(v1.legFacts.flatMap((f) => f.lotIds)).not.toContain('lot-pos-023-0')
    const intc = v1.preview.repurchaseRestrictions.filter((r) => r.symbol === 'INTC')
    expect(intc).toContainEqual({ symbol: 'INTC', start: '2026-01-26', until: '2026-03-27', source: { kind: 'recorded', saleId: 'rs-006', accountId: 'acc-002', saleDate: '2026-02-25' } })
    expect(intc.some((r) => r.source.kind === 'projected')).toBe(false)
    expect(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).toMatchObject({ ok: true, created: false, detail: { id: 'prop-0002' } })
  })
})

describe('return_to_advisor and escalate', () => {
  it('a return withdraws the approval and returns the orders; the advisor may approve again', () => {
    const a = approvedV1()
    const act = ok(returnToAdvisor(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'The SPY concentration needs a plan first.')).act
    expect(act).toMatchObject({ kind: 'return_to_advisor', summary: 'Returned v1 of the Johnson rebalance to the advisor; the approval is withdrawn', approvalActId: 'REC-0001' })
    expect(store().approvals[0]?.status).toBe('returned')
    expect(store().staged.every((o) => o.status === 'returned' && o.closedByActId === act.id)).toBe(true)
    expect(approvalState(proposalById(a.proposalId)!).kind).toBe('unapproved')
    expect(releaseOrders(MARK, a.proposalId, a.approvalActId, a.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'APPROVAL_RETURNED' })
    expect(approveProposal(ADRIAN, a.proposalId, 1, a.fingerprint).ok).toBe(true)
  })

  it('an escalation holds the orders, once; they can still be released', () => {
    const a = approvedV1()
    const act = ok(escalate(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'Concentration exception needs the investment committee.')).act
    expect(act.summary).toBe('Escalated the orders staged from v1 of the Johnson rebalance; they stay held')
    expect(detailOf(proposalById(a.proposalId)!).escalation).toEqual({ actId: act.id, at: act.at })
    expect(store().staged.every((o) => o.status === 'pending_compliance')).toBe(true)
    expect(escalate(MARK, a.proposalId, a.approvalActId, a.fingerprint, 'Again.')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ESCALATED' })
    expect(escalate(ADRIAN, a.proposalId, a.approvalActId, a.fingerprint, 'Mine.')).toMatchObject({ ok: false, status: 403 })
    expect(release(a).kind).toBe('release_orders')
  })
})
```

Create `src/mocks/workspace/__tests__/moved-book.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { runDriftMonitor } from '@/mocks/agents/drift-monitor'
import { runHarvestScanner } from '@/mocks/agents/harvest-scanner'
import { taxReturnFor, ytdRealisedOnReturn } from '@/mocks/handlers/tax-return'
import { proposalById } from '@/mocks/data/proposals-store'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO } from '@/lib/clock'
import { createProposal } from '../proposals'
import { ADRIAN, approvedStoryV3, approvedV1, ok, release } from './story-fixture'

const subject = { type: 'account', id: 'acc-002' } as const
const ctx = { asOf: MOCK_NOW_ISO, subject }
const acc002 = accounts.find((a) => a.id === 'acc-002')!

describe("after the story's v3 fills, every engine read sees the moved book", () => {
  it('the Harvest Scanner offers no INTC harvest and shows the recorded sale through 2026-03-27', () => {
    release(approvedStoryV3())
    const findings = runHarvestScanner(ctx)
    expect(findings.some((f) => f.claim.startsWith('Intel Corp. can be sold at a loss today'))).toBe(false)
    const recorded = findings.find((f) => f.citations.some((c) => c.source === 'Wash-sale window · rs-006 · INTC loss sale of 2026-02-25, open through 2026-03-27'))
    expect(recorded?.figures).toContainEqual({ label: 'Loss realised · INTC', value: -45_850, unit: 'USD', source: 'realisedSales.realisedGainLoss' })
  })

  it('the Drift Monitor measures the new holdings: US Equity still outside its band after a harvest-only version', () => {
    const a = approvedStoryV3()
    const projected = proposalById(a.proposalId)!.versions[2]!.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')!.drift
    release(a)
    const [first] = runDriftMonitor(ctx)
    expect(first?.claim).toBe('US Equity is outside its tolerance band.')
    expect(Math.abs(first!.figures[0]!.value - projected)).toBeLessThan(0.0005)
  })

  it('the return-level results include the realised INTC loss', () => {
    const returnId = taxReturnFor(acc002)!
    const before = ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm
    release(approvedStoryV3())
    expect(ytdRealisedOnReturn(returnId, MOCK_TODAY_ISO).longTerm).toBe(before - 45_850)
  })
})

describe('after v1 (the full rebalance) fills', () => {
  it('the Drift Monitor reports every class inside its band; private equity remains, for its own reason', () => {
    const a = approvedV1()
    const v1PrivateEquity = proposalById(a.proposalId)!.versions[0]!.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    release(a)
    const claims = runDriftMonitor(ctx).map((f) => f.claim)
    expect(claims[0]).toBe('Every asset class is inside its tolerance band.')
    expect(claims).toContain("Private Equity cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows.")
    const next = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).detail.versions[0]!
    const privateEquity = next.preview.projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'private_equity')!
    expect(privateEquity.residualReason).toBeDefined()
    expect(privateEquity.residualReason).toBe(v1PrivateEquity.residualReason)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/orders-acts.test.ts src/mocks/workspace/__tests__/moved-book.test.ts --testTimeout 30000`
Expected: FAIL — `../compliance-acts` does not exist.

- [ ] **Step 3: The clock and the orders acts**

In `src/mocks/data/workspace-store.ts` add:

```ts
/** Moves the event clock forward to `sequence` (fills wait for the open); it never runs backwards. */
export function advanceClockTo(sequence: number): void {
  const s = store()
  s.sequence = Math.max(s.sequence, sequence)
}
```

Create `src/mocks/workspace/compliance-acts.ts`:

```ts
import type { BindingAct, Message, ViaPresenter } from '@/types/workspace'
import type { ApprovalRecord, Proposal, ProposalVersion } from '@/types/workspace-proposal'
import { can } from '@/mocks/data/people'
import { advanceClockTo, commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { actOnApproval } from '@/mocks/data/proposals-store'
import { MOCK_NOW_ISO, MOCK_TODAY_ISO, eventTime } from '@/lib/clock'
import { isDuringNyseSession, nyseSessionUtc } from '@/lib/trading-calendar'
import { applyFills } from './fills'
import { closeStaging, recordAct, setApprovalStatus, visibleProposal } from './proposal-acts'

export type ComplianceFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type Recorded = { ok: true; act: BindingAct }
/** How the act was performed: through the presenter shortcut, it carries the firm-only marker. */
export type ActOptions = { viaPresenter?: ViaPresenter }

export const RATIONALE_MAX = 2000

const refuse = (status: ComplianceFailure['status'], code: string, message: string): ComplianceFailure => ({ ok: false, status, code, message })
const via = (options: ActOptions) => (options.viaPresenter ? { viaPresenter: options.viaPresenter } : {})

/** Every disposition carries a rationale: something other than whitespace, and not an essay. */
export function rationaleRefusal(rationale: string): ComplianceFailure | undefined {
  const trimmed = rationale.trim()
  if (trimmed.length === 0) return refuse(400, 'RATIONALE_REQUIRED', 'A rationale is required for every disposition.')
  if (trimmed.length > RATIONALE_MAX) return refuse(400, 'RATIONALE_TOO_LONG', `Keep the rationale to ${RATIONALE_MAX} characters or fewer.`)
  return undefined
}

type OrdersKind = 'release_orders' | 'return_to_advisor' | 'escalate'
type Guarded = { ok: true; proposal: Proposal; approval: ApprovalRecord; version: ProposalVersion }

/** The id of the act that closed an approval; the engine records one for every closed approval. */
function closedBy(kind: 'release_orders' | 'return_to_advisor', approval: ApprovalRecord): string {
  const act = actOnApproval(kind, approval.actId)
  if (!act) throw new Error(`Approval ${approval.actId} is ${approval.status} with no ${kind} act`)
  return act.id
}

function notActive(approval: ApprovalRecord): ComplianceFailure | undefined {
  const v = `v${approval.version}`
  switch (approval.status) {
    case 'active': return undefined
    case 'withdrawn': return refuse(409, 'APPROVAL_WITHDRAWN', `The approval of ${v} (${approval.actId}) was withdrawn by the advisor; nothing from it can be released.`)
    case 'superseded': return refuse(409, 'APPROVAL_SUPERSEDED', `The approval of ${v} (${approval.actId}) was superseded by a newer approval. Open the queue again.`)
    case 'returned': return refuse(409, 'APPROVAL_RETURNED', `${v} was already returned to the advisor (${closedBy('return_to_advisor', approval)}).`)
    case 'released': return refuse(409, 'ALREADY_RELEASED', `The orders from ${v} were already released (${closedBy('release_orders', approval)}).`)
  }
}

function ordersGuard(viewerId: string, kind: OrdersKind, proposalId: string, approvalActId: string, fingerprint: string, rationale: string): Guarded | ComplianceFailure {
  const proposal = visibleProposal(viewerId, proposalId)
  if (!proposal) return refuse(404, 'NO_PROPOSAL', 'Proposal not found.')
  if (!can(viewerId, kind)) return refuse(403, 'NOT_PERMITTED', 'Only compliance can release, return or escalate staged orders.')
  const badRationale = rationaleRefusal(rationale)
  if (badRationale) return badRationale
  const approval = store().approvals.find((a) => a.proposalId === proposal.id && a.actId === approvalActId)
  if (!approval) return refuse(409, 'NOT_THIS_APPROVAL', `${approvalActId} is not an approval of the ${proposal.title}.`)
  const stale = notActive(approval)
  if (stale) return stale
  if (approval.fingerprint !== fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', `The evidence you reviewed is not v${approval.version} as approved. Open it again.`)
  const version = proposal.versions.find((v) => v.n === approval.version)
  if (!version) throw new Error(`Approval ${approval.actId} names a missing version`)
  return { ok: true, proposal, approval, version }
}

const minuteOf = (iso: string) => Math.round((Date.parse(iso) - Date.parse(MOCK_NOW_ISO)) / 60_000)

/**
 * The event-clock sequences `count` fills take: after the `pending` events still to be recorded
 * ahead of them, and never before the NYSE opens today. Undefined when the session would close first.
 */
function sessionSequences(pending: number, count: number): number[] | undefined {
  const first = Math.max(store().sequence + pending + 1, minuteOf(nyseSessionUtc(MOCK_TODAY_ISO).open))
  const sequences = Array.from({ length: count }, (_, i) => first + i)
  return sequences.every((n) => isDuringNyseSession(eventTime(n))) ? sequences : undefined
}

export function releaseOrders(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const guard = ordersGuard(viewerId, 'release_orders', proposalId, approvalActId, fingerprint, rationale)
  if (!guard.ok) return guard
  const { proposal, approval, version } = guard
  const orders = store().staged.filter((o) => o.approvalActId === approval.actId && o.status === 'pending_compliance')
  // The act and its marker come first; the fills follow, at the open if the release is before it.
  const sequences = sessionSequences(2, orders.length)
  if (!sequences) return refuse(409, 'MARKET_CLOSED', "Today's session has closed; staged orders can be released at the next session.")
  const at = nextAt()
  const markerAt = nextAt()
  // Applied before anything is recorded: a fill that would break the ledger throws and records nothing.
  const fills = applyFills({ accountId: proposal.accountId, proposalId: proposal.id, version, orders, times: sequences.map(eventTime) })
  advanceClockTo(sequences[sequences.length - 1] ?? store().sequence)
  const act: BindingAct = {
    id: commitActId(), kind: 'release_orders', actorId: viewerId, at, threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: approval.version, fingerprint: approval.fingerprint,
    summary: `Released the orders staged from v${approval.version} of the ${proposal.title}`,
    rationale: rationale.trim(), approvalActId: approval.actId, ...via(options),
  }
  const s = store()
  s.acts.push(act)
  s.messages.push({ kind: 'act', id: nextId('msg'), threadId: proposal.threadId, at: markerAt, actId: act.id })
  const fillOf = new Map(fills.map((f) => [f.stagedOrderId, f.id]))
  s.staged = s.staged.map((o) => {
    const fillId = fillOf.get(o.id)
    return fillId ? { ...o, status: 'filled', closedByActId: act.id, fillId } : o
  })
  setApprovalStatus(approval, 'released')
  const report: Message = {
    kind: 'fills', id: nextId('msg'), threadId: proposal.threadId, at: nextAt(), proposalId: proposal.id,
    title: proposal.title, version: approval.version, releaseActId: act.id, fills,
  }
  s.messages.push(report)
  return { ok: true, act }
}

export function returnToAdvisor(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const guard = ordersGuard(viewerId, 'return_to_advisor', proposalId, approvalActId, fingerprint, rationale)
  if (!guard.ok) return guard
  const { proposal, approval } = guard
  const act: BindingAct = {
    id: commitActId(), kind: 'return_to_advisor', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: approval.version, fingerprint: approval.fingerprint,
    summary: `Returned v${approval.version} of the ${proposal.title} to the advisor; the approval is withdrawn`,
    rationale: rationale.trim(), approvalActId: approval.actId, ...via(options),
  }
  setApprovalStatus(approval, 'returned')
  closeStaging(approval.actId, act.id, 'returned')
  recordAct(act)
  return { ok: true, act }
}

export function escalate(viewerId: string, proposalId: string, approvalActId: string, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const guard = ordersGuard(viewerId, 'escalate', proposalId, approvalActId, fingerprint, rationale)
  if (!guard.ok) return guard
  const { proposal, approval } = guard
  const earlier = actOnApproval('escalate', approval.actId)
  if (earlier) return refuse(409, 'ALREADY_ESCALATED', `The orders from v${approval.version} are already escalated (${earlier.id}).`)
  const act: BindingAct = {
    id: commitActId(), kind: 'escalate', actorId: viewerId, at: nextAt(), threadId: proposal.threadId,
    subject: { type: 'proposal', id: proposal.id }, version: approval.version, fingerprint: approval.fingerprint,
    summary: `Escalated the orders staged from v${approval.version} of the ${proposal.title}; they stay held`,
    rationale: rationale.trim(), approvalActId: approval.actId, ...via(options),
  }
  recordAct(act)
  return { ok: true, act }
}
```

- [ ] **Step 4: Close a filled proposal; draft the next one from the moved book**

In `src/mocks/data/proposals-store.ts` add the one wording both refusals use:

```ts
/** Why a filled proposal refuses every change: its orders were filled, so the next proposal starts from the moved book. */
export const filledMessage = (version: number): string =>
  `The orders from v${version} were filled; this proposal is closed. Ask the Proposal Agent for a new one from the moved book.`
```

In `src/mocks/workspace/proposals.ts`, import `filledMessage, releasedApproval` from `@/mocks/data/proposals-store` and add:

```ts
/** A proposal whose orders were filled is closed. */
function closedRefusal(proposal: Proposal): ProposalFailure | undefined {
  const released = releasedApproval(proposal.id)
  return released ? refuse(409, 'FILLED', filledMessage(released.version)) : undefined
}
```

Call it right after the `visibleProposal` check in `reviseProposal`, `saveVersion` and `previewEdits` (`const closed = closedRefusal(proposal)` / `if (closed) return closed`). In `createProposal`, replace the `existing` lookup:

```ts
  const forAccount = proposalsInThread(thread.id).filter((p) => p.accountId === accountId)
  const existing = forAccount.find((p) => releasedApproval(p.id) === undefined)
  if (existing) return { ok: true, detail: detailOf(existing), created: false }
```

and give the new proposal `title: forAccount.length === 0 ? proposalTitle(accountId) : `${proposalTitle(accountId)} ${forAccount.length + 1}``.

In `src/mocks/workspace/proposal-acts.ts` `approveProposal`, after the permission check, add (import `filledMessage, releasedApproval` from `@/mocks/data/proposals-store`):

```ts
  const released = releasedApproval(proposal.id)
  if (released) return { ok: false, status: 409, code: 'FILLED', message: filledMessage(released.version) }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/orders-acts.test.ts src/mocks/workspace/__tests__/moved-book.test.ts src/mocks/workspace/__tests__ --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/workspace src/mocks/data/workspace-store.ts src/mocks/data/proposals-store.ts
git commit -m "feat(compliance): release, return and escalate staged orders; released orders fill and close the proposal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Alert dispositions and correspondence review

Mark disposes of the existing compliance alerts (approve, reject, request changes), each disposition appended to the alert's record trail after `sr-001`…`sr-003`, and reviews client correspondence after it was sent (reviewed, or flagged — a flagged message stays in the queue until it is reviewed). Both acts are recorded outside any thread: nothing is posted in Robert's thread, and nothing new reaches him.

**Rulings this task carries:**
- An alert is open while its fixture status is `pending` or `in_review` and the session has not disposed of it (`comp-001`, `comp-002`, `comp-003`, `comp-005`, `comp-007`). `approve` and `reject` close it; `request_changes` returns it to the advisor. All three leave Mark's queue. Trail actions read `Approved`, `Rejected`, `Changes requested`; the reviewer label is the directory's, `Mark Davis (CCO)`.
- The alert's evidence fingerprint covers its id, title, description, status and the ids on its record trail.
- `send_to_client` now records the id of the message it delivered (`messageId`), so the review names the message the client received; its evidence fingerprint is the send act's (the message body's).
- Correspondence transitions: none → reviewed or flagged; flagged → reviewed; a second flag `409 ALREADY_FLAGGED`; anything after reviewed `409 ALREADY_REVIEWED`.

**Files:**
- Create: `src/mocks/workspace/alerts.ts`, `src/mocks/workspace/correspondence.ts`
- Modify: `src/mocks/workspace/compliance-acts.ts` (append), `src/mocks/workspace/acts.ts` (`messageId`), `src/mocks/data/workspace-store.ts` (session supervision records), `src/mocks/handlers/compliance.ts` (export the fixture trail), `src/mocks/workspace/__tests__/story-fixture.ts` (append `sendLetter`)
- Test: `src/mocks/workspace/__tests__/review-acts.test.ts`

**Interfaces:**
- Consumes: `ComplianceFailure`, `Recorded`, `ActOptions`, `rationaleRefusal` (Task 4); `recordAct` (Task 1); `complianceAlerts` from `@/mocks/handlers/compliance`.
- Produces:

```ts
// src/mocks/handlers/compliance.ts
export const SUPERVISION_RECORDS: readonly SupervisionRecord[]          // was the private `supervisionRecords`

// src/mocks/data/workspace-store.ts
// WorkspaceState gains: supervisionRecords: SupervisionRecord[]; counters gain 'record'

// src/mocks/workspace/alerts.ts
export const ALERT_ACTION: Readonly<Record<AlertOutcome, string>>     // Approved / Rejected / Changes requested
export const isAlertOutcome: (value: unknown) => value is AlertOutcome
export function alertById(id: string): ComplianceAlert | undefined
export function alertDisposal(alertId: string): BindingAct | undefined
export function isOpenAlert(alert: ComplianceAlert): boolean
export function recordTrailFor(alertId: string): SupervisionRecord[]
export function alertFingerprint(alert: ComplianceAlert): string
export function alertContext(alert: ComplianceAlert): AlertContext

// src/mocks/workspace/correspondence.ts
export const isCorrespondenceOutcome: (value: unknown) => value is CorrespondenceOutcome
export type SentMessage = { act: BindingAct; message: TextMessage; thread: Thread }
export function sentMessages(): SentMessage[]
export function sentMessage(messageId: string): SentMessage | undefined
export function latestReview(messageId: string): BindingAct | undefined

// src/mocks/workspace/compliance-acts.ts (added)
export function disposeAlert(viewerId: string, alertId: string, outcome: AlertOutcome, fingerprint: string, rationale: string, options?: ActOptions): Recorded | ComplianceFailure
export function reviewCorrespondence(viewerId: string, messageId: string, outcome: CorrespondenceOutcome, fingerprint: string, rationale: string, options?: ActOptions): Recorded | ComplianceFailure

// story-fixture.ts (added)
export function sendLetter(a: Approved): { act: BindingAct; messageId: string }
```

Act summaries, exactly: `Approved the alert: {title}` / `Rejected the alert: {title}` / `Requested changes on the alert: {title}`; `Reviewed the message sent to {client full name}` / `Flagged the message sent to {client full name} for follow-up`.

- [ ] **Step 1: Write the failing tests**

Append to `src/mocks/workspace/__tests__/story-fixture.ts` (with `import { draftLetter } from '../letters'` and `import { sendToClient } from '../acts'` at the top):

```ts
/** Robert's letter from the approved version, sent by Adrian. */
export function sendLetter(a: Approved): { act: BindingAct; messageId: string } {
  const { draft } = ok(draftLetter(ADRIAN, 'th-robert', a.proposalId))
  const { act } = ok(sendToClient(ADRIAN, draft.id))
  if (!act.messageId) throw new Error('A sent letter names the message it delivered')
  return { act, messageId: act.messageId }
}
```

Create `src/mocks/workspace/__tests__/review-acts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { alertById, alertFingerprint, isOpenAlert, recordTrailFor } from '../alerts'
import { latestReview } from '../correspondence'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { ADRIAN, MARK, ROBERT, approvedV1, ok, sendLetter } from './story-fixture'

const AAPL = 'comp-002'
const fp = (id: string) => alertFingerprint(alertById(id)!)

describe('dispose_alert', () => {
  it('records the disposition outside any thread and appends it to the record trail', () => {
    const messages = store().messages.length
    const act = ok(disposeAlert(MARK, AAPL, 'approve', fp(AAPL), 'Long-held position; the IPS exception is documented.')).act
    expect(act).toEqual({
      id: 'REC-0001', kind: 'dispose_alert', actorId: MARK, at: act.at, subject: { type: 'alert', id: AAPL }, fingerprint: act.fingerprint,
      summary: 'Approved the alert: Single-name concentration — AAPL in Johnson Trust', rationale: 'Long-held position; the IPS exception is documented.', outcome: 'approve',
    })
    expect(store().messages).toHaveLength(messages)
    expect(recordTrailFor(AAPL).map((r) => r.id)).toEqual(['sr-003', 'sr-004'])
    expect(recordTrailFor(AAPL)[1]).toEqual({ id: 'sr-004', alertId: AAPL, reviewerId: MARK, reviewer: 'Mark Davis (CCO)', action: 'Approved', notes: 'Long-held position; the IPS exception is documented.', timestamp: act.at })
    expect(isOpenAlert(alertById(AAPL)!)).toBe(false)
  })

  it('a request for changes returns the alert and reads so on the trail', () => {
    ok(disposeAlert(MARK, 'comp-005', 'request_changes', fp('comp-005'), 'Schedule the IPS review before the anniversary.'))
    expect(recordTrailFor('comp-005').at(-1)?.action).toBe('Changes requested')
    expect(isOpenAlert(alertById('comp-005')!)).toBe(false)
  })

  it('refuses what is not compliance\'s, not open, stale or without a rationale', () => {
    expect(disposeAlert(ADRIAN, AAPL, 'approve', fp(AAPL), 'Mine.')).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(disposeAlert(ROBERT, AAPL, 'approve', fp(AAPL), 'Mine.')).toMatchObject({ ok: false, status: 404 })
    expect(disposeAlert(MARK, 'comp-999', 'approve', 'X', 'Why.')).toMatchObject({ ok: false, status: 404, code: 'NO_ALERT' })
    expect(disposeAlert(MARK, AAPL, 'approve', fp(AAPL), '  ')).toMatchObject({ ok: false, status: 400, code: 'RATIONALE_REQUIRED' })
    expect(disposeAlert(MARK, AAPL, 'approve', 'DEADBEEF', 'Why.')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    const closed = disposeAlert(MARK, 'comp-004', 'approve', fp('comp-004'), 'Why.')
    expect(closed).toMatchObject({ ok: false, status: 409, code: 'ALREADY_DISPOSED' })
    expect(closed.ok ? '' : closed.message).toBe('comp-004 is already closed.')
    const first = ok(disposeAlert(MARK, AAPL, 'reject', fp(AAPL), 'Reduce the position.')).act
    const again = disposeAlert(MARK, AAPL, 'approve', fp(AAPL), 'Changed my mind.')
    expect(again).toMatchObject({ ok: false, status: 409, code: 'ALREADY_DISPOSED' })
    expect(again.ok ? '' : again.message).toBe(`comp-002 was already disposed of (${first.id}).`)
    expect(store().acts).toHaveLength(1)
  })
})

describe('review_correspondence', () => {
  it('names the sent message; a flag keeps it open until it is reviewed', () => {
    const { act: sent, messageId } = sendLetter(approvedV1())
    expect(store().messages.find((m) => m.id === messageId)).toMatchObject({ kind: 'text', threadId: 'th-robert', authorId: ADRIAN })
    const flag = ok(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Check the look-back sentence with the advisor.')).act
    expect(flag).toEqual({
      id: flag.id, kind: 'review_correspondence', actorId: MARK, at: flag.at, subject: { type: 'message', id: messageId }, fingerprint: sent.fingerprint,
      summary: 'Flagged the message sent to Robert Johnson for follow-up', rationale: 'Check the look-back sentence with the advisor.', outcome: 'flagged',
    })
    expect(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Again.')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_FLAGGED' })
    const done = ok(reviewCorrespondence(MARK, messageId, 'reviewed', sent.fingerprint, 'Discussed with Adrian; the wording stands.')).act
    expect(done.summary).toBe('Reviewed the message sent to Robert Johnson')
    expect(latestReview(messageId)?.id).toBe(done.id)
    expect(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Late.')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_REVIEWED' })
  })

  it('only compliance reviews; a client is told the message does not exist; the client thread is untouched', () => {
    const { act: sent, messageId } = sendLetter(approvedV1())
    const robert = () => JSON.stringify([store().messages.filter((m) => m.threadId === 'th-robert'), store().acts.filter((a) => a.threadId === 'th-robert')])
    const before = robert()
    expect(reviewCorrespondence(ADRIAN, messageId, 'reviewed', sent.fingerprint, 'Mine.')).toMatchObject({ ok: false, status: 403 })
    expect(reviewCorrespondence(ROBERT, messageId, 'reviewed', sent.fingerprint, 'Mine.')).toMatchObject({ ok: false, status: 404 })
    expect(reviewCorrespondence(MARK, 'msg-9999', 'reviewed', sent.fingerprint, 'Why.')).toMatchObject({ ok: false, status: 404, code: 'NO_MESSAGE' })
    expect(reviewCorrespondence(MARK, messageId, 'reviewed', 'DEADBEEF', 'Why.')).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    ok(reviewCorrespondence(MARK, messageId, 'reviewed', sent.fingerprint, 'Accurate and balanced.'))
    expect(robert()).toBe(before)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/review-acts.test.ts --testTimeout 30000`
Expected: FAIL — `../alerts` does not exist.

- [ ] **Step 3: The fixture trail, the session trail, the sent message id**

`src/mocks/handlers/compliance.ts`: rename `const supervisionRecords: SupervisionRecord[]` to `export const SUPERVISION_RECORDS: readonly SupervisionRecord[]` and use it in the `/api/compliance/alerts/:alertId/records` handler.

`src/mocks/data/workspace-store.ts`: import `SupervisionRecord` from `@/types/compliance`; `Counter` becomes `'msg' | 'draft' | 'act' | 'proposal' | 'staged' | 'record'`; `WorkspaceState` gains `supervisionRecords: SupervisionRecord[]`; the seed sets `supervisionRecords: []` and `record: 0` in `counters`.

`src/mocks/workspace/acts.ts` `sendToClient`: create the text message before the act and record its id:

```ts
  const at = nextAt()
  const text: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewerId, at, body: draft.body }
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_client', actorId: viewerId, at, threadId: thread.id,
    subject: { type: 'draft', id: draftId }, fingerprint: fingerprint(draft.body), messageId: text.id,
    summary: 'Message sent to the client',
    // Books and records: an agent's letter records the approved version it came from and every person who edited it.
    ...(draft.agentId ? { basis: draft.basis, editedBy: draft.editorIds ?? [] } : {}),
  }
```

(the marker and the pushes stay as they are).

- [ ] **Step 4: Alerts and correspondence**

Create `src/mocks/workspace/alerts.ts`:

```ts
import type { ComplianceAlert, SupervisionRecord } from '@/types/compliance'
import type { AlertOutcome, BindingAct } from '@/types/workspace'
import type { AlertContext } from '@/types/workspace-supervision'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { store } from '@/mocks/data/workspace-store'
import { SUPERVISION_RECORDS, complianceAlerts } from '@/mocks/handlers/compliance'
import { fingerprint } from '@/lib/fingerprint'

/** How each disposition reads on the alert's record trail. */
export const ALERT_ACTION: Readonly<Record<AlertOutcome, string>> = { approve: 'Approved', reject: 'Rejected', request_changes: 'Changes requested' }

export const isAlertOutcome = (value: unknown): value is AlertOutcome => value === 'approve' || value === 'reject' || value === 'request_changes'

const AWAITING_REVIEW: ReadonlySet<ComplianceAlert['reviewStatus']> = new Set(['pending', 'in_review'])

export const alertById = (id: string): ComplianceAlert | undefined => complianceAlerts.find((a) => a.id === id)

export function alertDisposal(alertId: string): BindingAct | undefined {
  return store().acts.find((a) => a.kind === 'dispose_alert' && a.subject?.type === 'alert' && a.subject.id === alertId)
}

/** Awaiting compliance in the fixtures, and not yet disposed of this session. */
export function isOpenAlert(alert: ComplianceAlert): boolean {
  return AWAITING_REVIEW.has(alert.reviewStatus) && alertDisposal(alert.id) === undefined
}

/** The alert's supervision records: the fixtures' (sr-001 … sr-003), then the session's. */
export function recordTrailFor(alertId: string): SupervisionRecord[] {
  return [...SUPERVISION_RECORDS.filter((r) => r.alertId === alertId), ...store().supervisionRecords.filter((r) => r.alertId === alertId)]
}

/** The evidence a disposition acts on: the alert as stated and the trail it has. */
export function alertFingerprint(alert: ComplianceAlert): string {
  return fingerprint(JSON.stringify([alert.id, alert.title, alert.description, alert.reviewStatus, recordTrailFor(alert.id).map((r) => r.id)]))
}

/** The account and client an alert is about, as far as the fixtures name them. A trade alert names its account. */
export function alertContext(alert: ComplianceAlert): AlertContext {
  const accountId = alert.entityType === 'account' || alert.entityType === 'trade' ? alert.entityId : undefined
  const account = accounts.find((a) => a.id === accountId)
  const clientId = account?.clientId ?? (alert.entityType === 'client' ? alert.entityId : undefined)
  const client = clients.find((c) => c.id === clientId)
  return {
    ...(account ? { accountId: account.id, accountName: account.name } : {}),
    ...(client ? { clientId: client.id, clientName: client.fullName } : {}),
  }
}
```

Create `src/mocks/workspace/correspondence.ts`:

```ts
import type { BindingAct, CorrespondenceOutcome, Thread } from '@/types/workspace'
import type { TextMessage } from '@/types/workspace-supervision'
import { store } from '@/mocks/data/workspace-store'

export const isCorrespondenceOutcome = (value: unknown): value is CorrespondenceOutcome => value === 'reviewed' || value === 'flagged'

/** A message the firm sent a client: the send record, the message as delivered, and the client thread it is in. */
export type SentMessage = { act: BindingAct; message: TextMessage; thread: Thread }

export function sentMessages(): SentMessage[] {
  const s = store()
  return s.acts.flatMap((act) => {
    if (act.kind !== 'send_to_client' || !act.messageId) return []
    const message = s.messages.find((m): m is TextMessage => m.kind === 'text' && m.id === act.messageId)
    const thread = s.threads.find((t) => t.id === act.threadId)
    return message && thread ? [{ act, message, thread }] : []
  })
}

export const sentMessage = (messageId: string): SentMessage | undefined => sentMessages().find((m) => m.message.id === messageId)

export function latestReview(messageId: string): BindingAct | undefined {
  return store().acts.filter((a) => a.kind === 'review_correspondence' && a.subject?.type === 'message' && a.subject.id === messageId).at(-1)
}
```

Append to `src/mocks/workspace/compliance-acts.ts` (imports: `AlertOutcome`, `CorrespondenceOutcome` types; `personById` from `@/mocks/data/people`; `nextNumber` from `@/mocks/data/workspace-store`; `clients` from `@/mocks/data/clients`; `SUPERVISION_RECORDS` from `@/mocks/handlers/compliance`; `ALERT_ACTION, alertById, alertDisposal, alertFingerprint, isOpenAlert` from `./alerts`; `latestReview, sentMessage` from `./correspondence`; `canSeeThread` from `./visibility`):

```ts
const ALERT_SUMMARY: Readonly<Record<AlertOutcome, (title: string) => string>> = {
  approve: (title) => `Approved the alert: ${title}`,
  reject: (title) => `Rejected the alert: ${title}`,
  request_changes: (title) => `Requested changes on the alert: ${title}`,
}

const isClient = (viewerId: string) => personById(viewerId)?.role === 'client'

export function disposeAlert(viewerId: string, alertId: string, outcome: AlertOutcome, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const alert = alertById(alertId)
  if (!alert || isClient(viewerId) || !personById(viewerId)) return refuse(404, 'NO_ALERT', 'Alert not found.')
  if (!can(viewerId, 'dispose_alert')) return refuse(403, 'NOT_PERMITTED', 'Only compliance can dispose of an alert.')
  const badRationale = rationaleRefusal(rationale)
  if (badRationale) return badRationale
  if (!isOpenAlert(alert)) {
    const earlier = alertDisposal(alert.id)
    return refuse(409, 'ALREADY_DISPOSED', earlier ? `${alert.id} was already disposed of (${earlier.id}).` : `${alert.id} is already closed.`)
  }
  if (alertFingerprint(alert) !== fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', 'The alert or its record trail changed since you opened it. Open it again.')
  const reviewer = personById(viewerId)
  if (!reviewer) throw new Error(`No person ${viewerId}`)
  const act: BindingAct = {
    id: commitActId(), kind: 'dispose_alert', actorId: viewerId, at: nextAt(), subject: { type: 'alert', id: alert.id },
    fingerprint, summary: ALERT_SUMMARY[outcome](alert.title), rationale: rationale.trim(), outcome, ...via(options),
  }
  recordAct(act)
  store().supervisionRecords.push({
    id: `sr-${String(SUPERVISION_RECORDS.length + nextNumber('record')).padStart(3, '0')}`, alertId: alert.id,
    reviewerId: viewerId, reviewer: `${reviewer.name} (CCO)`, action: ALERT_ACTION[outcome], notes: rationale.trim(), timestamp: act.at,
  })
  return { ok: true, act }
}

export function reviewCorrespondence(viewerId: string, messageId: string, outcome: CorrespondenceOutcome, fingerprint: string, rationale: string, options: ActOptions = {}): Recorded | ComplianceFailure {
  const sent = sentMessage(messageId)
  if (!sent || isClient(viewerId) || !canSeeThread(viewerId, sent.thread)) return refuse(404, 'NO_MESSAGE', 'Message not found.')
  if (!can(viewerId, 'review_correspondence')) return refuse(403, 'NOT_PERMITTED', 'Only compliance can review client correspondence.')
  const badRationale = rationaleRefusal(rationale)
  if (badRationale) return badRationale
  const last = latestReview(messageId)
  if (last?.outcome === 'reviewed') return refuse(409, 'ALREADY_REVIEWED', `This message was already reviewed (${last.id}).`)
  if (last?.outcome === 'flagged' && outcome === 'flagged') return refuse(409, 'ALREADY_FLAGGED', `This message is already flagged (${last.id}).`)
  if (sent.act.fingerprint !== fingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', 'This is not the message as it was sent. Open it again.')
  const client = clients.find((c) => c.id === sent.thread.clientId)
  if (!client) throw new Error(`Thread ${sent.thread.id} names no client`)
  const act: BindingAct = {
    id: commitActId(), kind: 'review_correspondence', actorId: viewerId, at: nextAt(), subject: { type: 'message', id: messageId },
    fingerprint, summary: outcome === 'reviewed' ? `Reviewed the message sent to ${client.fullName}` : `Flagged the message sent to ${client.fullName} for follow-up`,
    rationale: rationale.trim(), outcome, ...via(options),
  }
  recordAct(act)
  return { ok: true, act }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/review-acts.test.ts src/mocks/workspace/__tests__ src/mocks/handlers/__tests__/supervision-records.test.ts --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/workspace src/mocks/data/workspace-store.ts src/mocks/handlers/compliance.ts
git commit -m "feat(compliance): alert dispositions on the record trail; post-send correspondence review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The supervision queue and the archive, as each viewer may read them

Read models only: the queue in three groups plus "Disposed today", and the archive of every recorded act and sent client message, chronological, filtered. Firm viewers read both (each item and entry only where they could see its thread); clients get nothing.

**Rulings this task carries:**
- Orders awaiting release: every active approval with a pending staged order, on a proposal the viewer can see. Alerts: open alerts, critical first, then newest. Correspondence: sent messages in client threads the viewer can see, not yet reviewed (flagged ones stay). Disposed today: every compliance act recorded today, newest first, with its item as it stands now.
- An archive entry is visible when its thread is (an alert disposition has none and is visible to every firm viewer; a correspondence review's thread is the message's). A sent message appears both as its `send_to_client` act and as a `sent_message` entry. Order: by time, then by id in code-unit order. `clients` and `dates` describe the unfiltered archive the viewer may read.

**Files:**
- Create: `src/mocks/workspace/supervision.ts`, `src/mocks/workspace/archive.ts`
- Test: `src/mocks/workspace/__tests__/supervision.test.ts`, `src/mocks/workspace/__tests__/archive.test.ts`

**Interfaces:**
- Consumes: Task 5's `alerts.ts` and `correspondence.ts`; Task 1's `escalationOf`, `ledgerFills`; `visibleProposal`, `canSeeThread`.
- Produces:

```ts
// src/mocks/workspace/supervision.ts
export const COMPLIANCE_ACT_KINDS: ReadonlySet<BindingActKind>
export function ordersItem(proposal: Proposal, approval: ApprovalRecord): OrdersItem
export function alertItem(alert: ComplianceAlert): AlertItem
export function correspondenceItem(sent: SentMessage): CorrespondenceItem
export function supervisionQueue(viewerId: string): SupervisionQueue | undefined   // undefined: a client or unknown viewer (404)

// src/mocks/workspace/archive.ts
export const ARCHIVE_KINDS: readonly ArchiveKind[]
export const isArchiveKind: (value: string) => value is ArchiveKind
export function archiveFor(viewerId: string, filters: ArchiveFilters): Archive | undefined   // undefined: 404
```

Titles: orders `{proposal title} · v{n}` ("Johnson rebalance · v3"); alert: its title; correspondence `Message to {client full name}`.

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/supervision.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { alertById, alertFingerprint } from '../alerts'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { supervisionQueue } from '../supervision'
import { MARK, approvedV1, ok, release, sendLetter } from './story-fixture'

const queue = (viewer = MARK) => {
  const q = supervisionQueue(viewer)
  if (!q) throw new Error(`${viewer} has no queue`)
  return q
}

describe('the supervision queue', () => {
  it('opens with the open alerts, critical first, and nothing else', () => {
    expect(queue()).toMatchObject({ orders: [], correspondence: [], disposedToday: [] })
    expect(queue().alerts.map((a) => a.id)).toEqual(['comp-001', 'comp-002', 'comp-003', 'comp-005', 'comp-007'])
    expect(queue().alerts[1]).toMatchObject({ title: 'Single-name concentration — AAPL in Johnson Trust', context: { accountId: 'acc-001', accountName: 'Johnson Family Trust', clientId: 'cli-001', clientName: 'Robert Johnson' } })
    expect(queue().alerts[1]?.trail.map((r) => r.id)).toEqual(['sr-003'])
  })

  it('lists the staged orders of an approval as the approval record and the version it names', () => {
    const a = approvedV1()
    const [orders] = queue().orders
    expect(orders).toMatchObject({ kind: 'orders', id: 'prop-0001', title: 'Johnson rebalance · v1', accountName: 'Robert Johnson Individual', threadId: 'th-johnson-review', latestVersion: 1, fingerprint: a.fingerprint, approval: { actId: 'REC-0001', approverId: 'user-001', status: 'active' } })
    expect(orders?.version.n).toBe(1)
    expect(orders?.staged.every((o) => o.status === 'pending_compliance')).toBe(true)
    expect(queue('user-001').orders.map((o) => o.id)).toEqual(['prop-0001'])
  })

  it('lists sent client correspondence for the viewers who can see the client thread', () => {
    const { messageId } = sendLetter(approvedV1())
    expect(queue().correspondence).toMatchObject([{ kind: 'correspondence', id: messageId, title: 'Message to Robert Johnson', threadId: 'th-robert', flagged: false }])
    expect(queue().correspondence[0]?.message.body).toMatch(/^Dear Robert,/)
    expect(queue().correspondence[0]?.sendAct.basis?.version).toBe(1)
    expect(queue('user-003').correspondence).toEqual([])
  })

  it('moves disposed items to "Disposed today", newest first; a flagged message stays in the queue', () => {
    const a = approvedV1()
    const { act: sent, messageId } = sendLetter(a)
    const released = release(a)
    const disposed = ok(disposeAlert(MARK, 'comp-002', 'approve', alertFingerprint(alertById('comp-002')!), 'Documented exception.')).act
    const flagged = ok(reviewCorrespondence(MARK, messageId, 'flagged', sent.fingerprint, 'Follow up on the look-back.')).act
    const q = queue()
    expect(q.orders).toEqual([])
    expect(q.alerts.map((x) => x.id)).not.toContain('comp-002')
    expect(q.correspondence.map((c) => [c.id, c.flagged])).toEqual([[messageId, true]])
    expect(q.disposedToday.map((d) => [d.act.id, d.item.kind])).toEqual([[flagged.id, 'correspondence'], [disposed.id, 'alert'], [released.id, 'orders']])
    const orders = q.disposedToday[2]!.item
    if (orders.kind !== 'orders') throw new Error('orders item')
    expect(orders.staged.every((o) => o.status === 'filled')).toBe(true)
    expect(orders.fills).toHaveLength(orders.version.preview.trades.length)
    const alert = q.disposedToday[1]!.item
    if (alert.kind !== 'alert') throw new Error('alert item')
    expect(alert.disposition).toBe('approve')
    expect(alert.trail.map((r) => r.id)).toEqual(['sr-003', 'sr-004'])
  })

  it('a client has no queue', () => {
    expect(supervisionQueue('cli-001')).toBeUndefined()
    expect(supervisionQueue('nobody')).toBeUndefined()
  })
})
```

Create `src/mocks/workspace/__tests__/archive.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { alertById, alertFingerprint } from '../alerts'
import { archiveFor } from '../archive'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { MARK, approvedV1, ok, release, sendLetter } from './story-fixture'

function session() {
  const a = approvedV1()
  const { act: sent, messageId } = sendLetter(a)
  release(a)
  ok(disposeAlert(MARK, 'comp-002', 'approve', alertFingerprint(alertById('comp-002')!), 'Documented exception.'))
  ok(reviewCorrespondence(MARK, messageId, 'reviewed', sent.fingerprint, 'Accurate and balanced.'))
}
const kinds = (viewer: string, filters = {}) => archiveFor(viewer, filters)!.entries.map((e) => (e.kind === 'act' ? e.act.kind : e.kind))

describe('the archive', () => {
  it('lists every recorded act and sent message in order, each with its thread and client', () => {
    session()
    expect(kinds(MARK)).toEqual(['approve_proposal', 'send_to_client', 'sent_message', 'release_orders', 'dispose_alert', 'review_correspondence'])
    const entries = archiveFor(MARK, {})!.entries
    expect(entries.find((e) => e.kind === 'act' && e.act.kind === 'release_orders')).toMatchObject({ threadId: 'th-johnson-review', threadTitle: 'Johnson Rebalance Review', clientId: 'cli-001', clientName: 'Robert Johnson' })
    expect(entries.find((e) => e.kind === 'act' && e.act.kind === 'review_correspondence')).toMatchObject({ threadId: 'th-robert', clientId: 'cli-001' })
    const alert = entries.find((e) => e.kind === 'act' && e.act.kind === 'dispose_alert')
    expect(alert).toMatchObject({ clientId: 'cli-001' })
    expect(alert && 'threadId' in alert ? alert.threadId : undefined).toBeUndefined()
    expect(entries.find((e) => e.kind === 'sent_message')).toMatchObject({ threadId: 'th-robert', clientName: 'Robert Johnson' })
  })

  it('filters by client, kind and date, and lists what the filters can choose', () => {
    session()
    expect(kinds(MARK, { kind: 'release_orders' })).toEqual(['release_orders'])
    expect(kinds(MARK, { kind: 'sent_message' })).toEqual(['sent_message'])
    expect(kinds(MARK, { clientId: 'cli-001' })).toHaveLength(6)
    expect(kinds(MARK, { clientId: 'cli-003' })).toEqual([])
    expect(kinds(MARK, { from: '2026-02-25', to: '2026-02-25' })).toHaveLength(6)
    expect(kinds(MARK, { from: '2026-02-26' })).toEqual([])
    expect(archiveFor(MARK, { kind: 'release_orders' })).toMatchObject({ clients: [{ id: 'cli-001', name: 'Robert Johnson' }], dates: ['2026-02-25'] })
  })

  it('shows each viewer only the threads they can see; a client has no archive', () => {
    session()
    expect(kinds('user-003')).toEqual(['approve_proposal', 'release_orders', 'dispose_alert'])
    expect(archiveFor('cli-001', {})).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/supervision.test.ts src/mocks/workspace/__tests__/archive.test.ts --testTimeout 30000`
Expected: FAIL — the modules do not exist.

- [ ] **Step 3: Write the read models**

Create `src/mocks/workspace/supervision.ts`:

```ts
import type { AlertSeverity, ComplianceAlert } from '@/types/compliance'
import type { BindingAct, BindingActKind } from '@/types/workspace'
import type { ApprovalRecord, Proposal } from '@/types/workspace-proposal'
import type { AlertItem, CorrespondenceItem, OrdersItem, SupervisionItem, SupervisionQueue } from '@/types/workspace-supervision'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { escalationOf, latestVersion } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { alertById, alertContext, alertDisposal, alertFingerprint, isAlertOutcome, isOpenAlert, recordTrailFor } from './alerts'
import { latestReview, sentMessage, sentMessages, type SentMessage } from './correspondence'
import { visibleProposal } from './proposal-acts'
import { canSeeThread } from './visibility'

export const COMPLIANCE_ACT_KINDS: ReadonlySet<BindingActKind> = new Set(['release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence'])

const SEVERITY_ORDER: Readonly<Record<AlertSeverity, number>> = { critical: 0, warning: 1, info: 2 }

export function ordersItem(proposal: Proposal, approval: ApprovalRecord): OrdersItem {
  const version = proposal.versions.find((v) => v.n === approval.version)
  const account = accounts.find((a) => a.id === proposal.accountId)
  if (!version || !account) throw new Error(`Approval ${approval.actId} names a missing version or account`)
  const escalation = escalationOf(approval.actId)
  return {
    kind: 'orders', id: proposal.id, title: `${proposal.title} · v${approval.version}`, proposalId: proposal.id,
    accountId: account.id, accountName: account.name, clientId: proposal.clientId, threadId: proposal.threadId,
    approval, version, latestVersion: latestVersion(proposal).n,
    staged: store().staged.filter((o) => o.approvalActId === approval.actId),
    fills: ledgerFills().filter((f) => f.proposalId === proposal.id && f.version === approval.version),
    ...(escalation ? { escalation } : {}),
    fingerprint: approval.fingerprint,
  }
}

export function alertItem(alert: ComplianceAlert): AlertItem {
  const outcome = alertDisposal(alert.id)?.outcome
  return {
    kind: 'alert', id: alert.id, title: alert.title, alert, trail: recordTrailFor(alert.id), context: alertContext(alert),
    ...(isAlertOutcome(outcome) ? { disposition: outcome } : {}),
    fingerprint: alertFingerprint(alert),
  }
}

export function correspondenceItem(sent: SentMessage): CorrespondenceItem {
  const client = clients.find((c) => c.id === sent.thread.clientId)
  if (!client) throw new Error(`Thread ${sent.thread.id} names no client`)
  return {
    kind: 'correspondence', id: sent.message.id, title: `Message to ${client.fullName}`, threadId: sent.thread.id,
    clientId: client.id, clientName: client.fullName, message: sent.message, sendAct: sent.act,
    flagged: latestReview(sent.message.id)?.outcome === 'flagged', fingerprint: sent.act.fingerprint,
  }
}

/** The item a compliance act disposed of, as it stands now, when the viewer may see it. */
function itemOf(viewerId: string, act: BindingAct): SupervisionItem | undefined {
  const subject = act.subject
  if (subject?.type === 'proposal') {
    const proposal = visibleProposal(viewerId, subject.id)
    const approval = store().approvals.find((a) => a.actId === act.approvalActId)
    return proposal && approval ? ordersItem(proposal, approval) : undefined
  }
  if (subject?.type === 'alert') {
    const alert = alertById(subject.id)
    return alert ? alertItem(alert) : undefined
  }
  if (subject?.type === 'message') {
    const sent = sentMessage(subject.id)
    return sent && canSeeThread(viewerId, sent.thread) ? correspondenceItem(sent) : undefined
  }
  return undefined
}

/** The queue as the viewer may read it. Every firm viewer reads it; only compliance acts on it. */
export function supervisionQueue(viewerId: string): SupervisionQueue | undefined {
  const viewer = personById(viewerId)
  if (!viewer || viewer.role === 'client') return undefined
  const s = store()
  const orders = s.approvals.filter((a) => a.status === 'active').flatMap((approval) => {
    const proposal = visibleProposal(viewerId, approval.proposalId)
    const pending = s.staged.some((o) => o.approvalActId === approval.actId && o.status === 'pending_compliance')
    return proposal && pending ? [ordersItem(proposal, approval)] : []
  })
  const alerts = complianceAlerts
    .filter(isOpenAlert)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.createdAt.localeCompare(a.createdAt))
    .map(alertItem)
  const correspondence = sentMessages()
    .filter((m) => canSeeThread(viewerId, m.thread) && latestReview(m.message.id)?.outcome !== 'reviewed')
    .map(correspondenceItem)
  const disposedToday = s.acts
    .filter((a) => COMPLIANCE_ACT_KINDS.has(a.kind) && a.at.slice(0, 10) === MOCK_TODAY_ISO)
    .reverse()
    .flatMap((act) => {
      const item = itemOf(viewerId, act)
      return item ? [{ item, act }] : []
    })
  return { orders, alerts, correspondence, disposedToday }
}
```

Create `src/mocks/workspace/archive.ts`:

```ts
import type { BindingAct, Thread } from '@/types/workspace'
import type { Archive, ArchiveEntry, ArchiveFilters, ArchiveKind } from '@/types/workspace-supervision'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { proposalById } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'
import { alertById, alertContext } from './alerts'
import { sentMessage } from './correspondence'
import { canSeeThread } from './visibility'

export const ARCHIVE_KINDS: readonly ArchiveKind[] = [
  'approve_proposal', 'withdraw_approval', 'send_to_client', 'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence', 'sent_message',
]
export const isArchiveKind = (value: string): value is ArchiveKind => (ARCHIVE_KINDS as readonly string[]).includes(value)

/** Code-unit order, the same on every machine. */
const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const clientName = (id: string | undefined) => clients.find((c) => c.id === id)?.fullName

/** The thread an act belongs to: where it was recorded, or for a correspondence review, the message's client thread. */
function threadOf(act: BindingAct): Thread | undefined {
  const id = act.threadId ?? (act.subject?.type === 'message' ? sentMessage(act.subject.id)?.thread.id : undefined)
  return id === undefined ? undefined : store().threads.find((t) => t.id === id)
}

function clientOf(act: BindingAct, thread: Thread | undefined): string | undefined {
  if (act.subject?.type === 'proposal') return proposalById(act.subject.id)?.clientId
  if (act.subject?.type === 'alert') {
    const alert = alertById(act.subject.id)
    return alert ? alertContext(alert).clientId : undefined
  }
  return thread?.clientId
}

function entriesOf(act: BindingAct): ArchiveEntry[] {
  const thread = threadOf(act)
  const clientId = clientOf(act, thread)
  const name = clientName(clientId)
  const entry: ArchiveEntry = {
    kind: 'act', id: act.id, at: act.at, act,
    ...(clientId ? { clientId } : {}), ...(name ? { clientName: name } : {}),
    ...(thread ? { threadId: thread.id, threadTitle: thread.title } : {}),
  }
  const sent = act.kind === 'send_to_client' && act.messageId ? sentMessage(act.messageId) : undefined
  const sentClient = sent?.thread.clientId
  if (!sent || !sentClient) return [entry]
  return [entry, {
    kind: 'sent_message', id: sent.message.id, at: sent.message.at, message: sent.message, actId: act.id, fingerprint: act.fingerprint,
    clientId: sentClient, clientName: clientName(sentClient) ?? sent.thread.title, threadId: sent.thread.id, threadTitle: sent.thread.title,
  }]
}

const kindOf = (e: ArchiveEntry): ArchiveKind => (e.kind === 'act' ? e.act.kind : 'sent_message')

/** The books-and-records surface: every act and sent client message the viewer may read, in order, filtered. */
export function archiveFor(viewerId: string, filters: ArchiveFilters): Archive | undefined {
  const viewer = personById(viewerId)
  if (!viewer || viewer.role === 'client') return undefined
  const readable = (act: BindingAct) => {
    const thread = threadOf(act)
    return thread ? canSeeThread(viewerId, thread) : act.kind === 'dispose_alert'
  }
  const all = store().acts.filter(readable).flatMap(entriesOf).sort((a, b) => byCodeUnit(a.at, b.at) || byCodeUnit(a.id, b.id))
  const day = (e: ArchiveEntry) => e.at.slice(0, 10)
  const entries = all.filter((e) => (filters.clientId === undefined || e.clientId === filters.clientId)
    && (filters.kind === undefined || kindOf(e) === filters.kind)
    && (filters.from === undefined || day(e) >= filters.from)
    && (filters.to === undefined || day(e) <= filters.to))
  const named = new Map(all.flatMap((e) => (e.clientId && e.clientName ? [[e.clientId, e.clientName] as const] : [])))
  return {
    entries,
    clients: [...named].map(([id, name]) => ({ id, name })).sort((a, b) => byCodeUnit(a.name, b.name)),
    dates: [...new Set(all.map(day))].sort(byCodeUnit),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/supervision.test.ts src/mocks/workspace/__tests__/archive.test.ts --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/mocks/workspace/supervision.ts src/mocks/workspace/archive.ts src/mocks/workspace/__tests__/supervision.test.ts src/mocks/workspace/__tests__/archive.test.ts
git commit -m "feat(compliance): the supervision queue and the archive, viewer-filtered

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The Brief re-measures on view; the Drift Monitor says "through"

The Brief is composed once for the frozen morning. Once fills move the book, opening the Brief re-measures it: its findings and ranked summary are composed again from the moved book and replace the morning's (a Brief is "as it stands", not a record; carried cards keep their own quotation). The Phase 3 parked wording fix lands here: the Drift Monitor's replacement-hold citation reads "open through <date>", like the Harvest Scanner's.

**Files:**
- Create: `src/mocks/workspace/brief-remeasure.ts`
- Modify: `src/mocks/workspace/brief.ts`, `src/mocks/data/workspace-store.ts` (`briefBook`), `src/mocks/handlers/workspace.ts` (GET thread), `src/mocks/agents/drift-monitor.ts:77`
- Test: `src/mocks/workspace/__tests__/brief-remeasure.test.ts` (new), `src/mocks/agents/__tests__/agents.test.ts:117`

**Interfaces:**
- Consumes: `bookVersion` (Task 1); `runKeyOf` with the book version (Task 2); the story fixture and `releaseOrders` (Task 4).
- Produces:

```ts
// src/mocks/workspace/brief.ts
export function composeBrief(idOf: (index: number) => string, at: string): Message[]   // index 0 is the ranked summary
export function briefMessages(): Message[]                                           // the morning's Brief (msg-b00 …)

// src/mocks/workspace/brief-remeasure.ts
export function remeasureBrief(): void   // no-op unless the book moved since the Brief was measured; ids msg-r{book}-00 …

// src/mocks/data/workspace-store.ts
// WorkspaceState gains: briefBook: number  — the book version the Brief's findings measured
```

- [ ] **Step 1: Write the failing tests**

In `src/mocks/agents/__tests__/agents.test.ts` change the expected citation to `` `Wash-sale window · rs-001 · INTC loss sale of ${sale.saleDate}, open through ${end}` ``.

Create `src/mocks/workspace/__tests__/brief-remeasure.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/workspace'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { BRIEF_THREAD_ID, briefMessages } from '../brief'
import { remeasureBrief } from '../brief-remeasure'
import { approvedStoryV3, approvedV1, release } from './story-fixture'

type Finding = Extract<Message, { kind: 'agent_finding' }>
const brief = () => store().messages.filter((m) => m.threadId === BRIEF_THREAD_ID)
const findings = () => brief().filter((m): m is Finding => m.kind === 'agent_finding')
const summary = () => {
  const s = brief().find((m) => m.kind === 'brief_summary')
  if (s?.kind !== 'brief_summary') throw new Error('The Brief has a summary')
  return s
}
async function openBrief() {
  const res = await fetch(`/api/workspace/threads/${BRIEF_THREAD_ID}`, { headers: { 'X-Viewer': 'user-001' } })
  return (await res.json()) as { messages: Message[] }
}

describe('the Brief re-measures on view once the book has moved', () => {
  it('is the morning\'s Brief until something fills', async () => {
    const morning = briefMessages().map((m) => m.id)
    remeasureBrief()
    expect((await openBrief()).messages.map((m) => m.id)).toEqual(morning)
  })

  it("after the story's v3 fills: no INTC harvest, the recorded sale through 2026-03-27, US Equity still outside", async () => {
    release(approvedStoryV3())
    const { messages } = await openBrief()
    expect(messages[0]).toMatchObject({ kind: 'brief_summary', id: 'msg-r1-00' })
    expect(messages.every((m) => m.at > MOCK_NOW_ISO)).toBe(true)
    expect(findings().some((f) => f.claim.startsWith('Intel Corp. can be sold at a loss today'))).toBe(false)
    expect(findings().some((f) => f.citations.some((c) => c.source === 'Wash-sale window · rs-006 · INTC loss sale of 2026-02-25, open through 2026-03-27'))).toBe(true)
    expect(summary().items[0]?.claim).toBe('US Equity is outside its tolerance band.')
    expect(findings().every((f) => f.runKey.endsWith('|book 1'))).toBe(true)
    const ids = brief().map((m) => m.id)
    await openBrief()
    expect(brief().map((m) => m.id)).toEqual(ids)
  })

  it('after v1 fills: every class inside its band, private equity still noted', async () => {
    release(approvedV1())
    await openBrief()
    expect(summary().items.map((i) => i.claim)).toContain('Every asset class is inside its tolerance band.')
    expect(findings().map((f) => f.claim)).toContain("Private Equity cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows.")
  })

  it('a reset brings back the morning', async () => {
    release(approvedV1())
    await openBrief()
    resetWorkspaceStore()
    expect((await openBrief()).messages.map((m) => m.id)).toEqual(briefMessages().map((m) => m.id))
    expect(brief()[0]?.id).toBe('msg-b00')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/brief-remeasure.test.ts src/mocks/agents/__tests__/agents.test.ts --testTimeout 30000`
Expected: FAIL — `../brief-remeasure` does not exist; the citation still says "open to".

- [ ] **Step 3: Implement**

`src/mocks/agents/drift-monitor.ts`: the replacement-hold citation becomes `` `Wash-sale window · ${w.id} · ${w.symbol} loss sale of ${w.saleDate}, open through ${w.end}` ``.

`src/mocks/workspace/brief.ts`: import `bookVersion` from `@/mocks/data/portfolio-ledger`; turn `composeBrief` into an export taking the ids and time, and cache only the morning's:

```ts
const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * The Brief as it stands: each of its agents' findings on the book as it is now, and a ranked
 * summary ahead of them — findings that need attention first, then in the order the Brief lists its
 * agents. `idOf(0)` names the summary, `idOf(n)` the nth finding.
 */
export function composeBrief(idOf: (index: number) => string, at: string): Message[] {
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
    .map((f, i) => ({ kind: 'agent_finding', id: idOf(i + 1), threadId: thread.id, at, ...f }))
  const order = (id: AgentId) => thread.agentIds.indexOf(id)
  const ranked = [...findings].sort((a, b) =>
    Number(b.attention === 'attention') - Number(a.attention === 'attention') || order(a.agentId) - order(b.agentId))
  const summary: Message = {
    kind: 'brief_summary', id: idOf(0), threadId: thread.id, at,
    items: ranked.map((f) => ({ findingId: f.id, agentId: f.agentId, claim: f.claim, attention: f.attention })),
  }
  return [summary, ...findings]
}

/** The morning's Brief, at the calculations' as-of. Deterministic for the fixtures' book, so it is composed once. */
export function briefMessages(): Message[] {
  const morning = () => composeBrief((i) => `msg-b${pad2(i)}`, MOCK_NOW_ISO)
  if (bookVersion() > 0) return morning()
  composed ??= morning()
  return composed.map((m) => ({ ...m }))
}
```

`src/mocks/data/workspace-store.ts`: import `bookVersion` from `'./portfolio-ledger'`; `WorkspaceState` gains `briefBook: number`, seeded `briefBook: bookVersion()`.

Create `src/mocks/workspace/brief-remeasure.ts`:

```ts
import { bookVersion } from '@/mocks/data/portfolio-ledger'
import { nextAt, store } from '@/mocks/data/workspace-store'
import { BRIEF_THREAD_ID, composeBrief } from './brief'

/**
 * The Brief re-measures on view: once fills have moved the book since its findings were measured,
 * they and the ranked summary are composed again and replace the earlier ones. Carried cards in
 * team threads keep their own quotation of what the Brief said when they were carried.
 */
export function remeasureBrief(): void {
  const s = store()
  const book = bookVersion()
  if (s.briefBook === book) return
  const measured = composeBrief((i) => `msg-r${book}-${String(i).padStart(2, '0')}`, nextAt())
  s.messages = [
    ...s.messages.filter((m) => m.threadId !== BRIEF_THREAD_ID || (m.kind !== 'agent_finding' && m.kind !== 'brief_summary')),
    ...measured,
  ]
  s.briefBook = book
}
```

`src/mocks/handlers/workspace.ts` `GET /api/workspace/threads/:id`: after the visibility check, `if (thread.id === BRIEF_THREAD_ID) remeasureBrief()` (import both).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/brief-remeasure.test.ts src/mocks/workspace/__tests__/brief.test.ts src/mocks/agents/__tests__/agents.test.ts --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/mocks/workspace/brief.ts src/mocks/workspace/brief-remeasure.ts src/mocks/data/workspace-store.ts src/mocks/handlers/workspace.ts src/mocks/agents/drift-monitor.ts src/mocks/agents/__tests__/agents.test.ts src/mocks/workspace/__tests__/brief-remeasure.test.ts
git commit -m "feat(brief): re-measure the Brief on view once the book moves; windows read 'through'

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The presenter shortcut, the four endpoints, services and hooks

`POST /api/workspace/acts` takes the five compliance kinds; `GET /api/workspace/supervision` and `GET /api/workspace/archive?clientId=&kind=&from=&to=` serve the read models; `POST /api/workspace/presenter/act-as-cco` performs Mark's default disposition for a named item, recorded as `cco-001` with `viaPresenter`. The client functions and hooks follow; a compliance act or a shortcut invalidates every query, because the book moved under accounts, positions, drift and lots, not only the workspace.

**Rulings this task carries:**
- A client viewer gets `404` from `POST /acts` for every kind and every body, before any validation (Phase 3 parked minor: no more mixed 400/404). A client's `GET /acts` lists only `send_to_client` records, stripped of provenance as before.
- The presenter shortcut may be used by any firm viewer except the compliance officer himself (`400 NOT_A_PRESENTER`): its defaults are `release_orders` with the active approval for orders, `approve` for an alert, `reviewed` for correspondence. Default rationales, exactly:
  - orders: `Reviewed the approved version, its legs, tax effect, pre-trade reading and repurchase restrictions. Released for execution.`
  - alert: `Reviewed the alert, its record trail and the account context. Approved.`
  - correspondence: `Reviewed the message as the client received it, with its provenance. No follow-up needed.`
- Archive filters: an unknown `kind` → `400 BAD_FILTER`; a `from`/`to` that is not `YYYY-MM-DD`, or `from` after `to` → `400 BAD_FILTER`; an unknown `clientId` simply matches nothing.

**Files:**
- Create: `src/mocks/workspace/presenter.ts`, `src/mocks/handlers/workspace-supervision.ts`
- Modify: `src/mocks/handlers/workspace.ts` (`POST /acts`, `GET /acts`, register the new handlers before the catch-all), `src/services/workspace.ts`, `src/hooks/use-workspace.ts`
- Test: `src/mocks/handlers/__tests__/workspace-supervision-api.test.ts` (new), `src/hooks/__tests__/use-workspace-supervision.test.tsx` (new)

**Interfaces:**
- Consumes: Tasks 4–6 engine functions; `firmViewer`, `badRequest`, `refusal`, `readJson`, `nonEmptyString` from `workspace-http.ts`.
- Produces:

```ts
// src/mocks/workspace/presenter.ts
export const CCO_DEFAULT_RATIONALE: Readonly<Record<SupervisionItemKind, string>>
export function actAsCco(presenterId: string, item: PresenterItem): Recorded | ComplianceFailure

// src/mocks/handlers/workspace-supervision.ts
export function parseComplianceAct(body: Record<string, unknown>): { ok: true; request: ComplianceActRequest } | { ok: false; message: string }
export function recordComplianceAct(viewerId: string, request: ComplianceActRequest): Recorded | ComplianceFailure
export const workspaceSupervisionHandlers: HttpHandler[]

// src/services/workspace.ts
export const recordComplianceAct: (viewer: string, request: ComplianceActRequest) => Promise<BindingAct>
export const getSupervision: (viewer: string) => Promise<SupervisionQueue>
export const getArchive: (viewer: string, filters: ArchiveFilters) => Promise<Archive>
export const actAsCco: (viewer: string, item: PresenterItem) => Promise<BindingAct>

// src/hooks/use-workspace.ts
export function useSupervision(): UseQueryResult<SupervisionQueue>          // ['workspace', viewerId, 'supervision']
export function useArchive(filters: ArchiveFilters): UseQueryResult<Archive> // ['workspace', viewerId, 'archive', JSON.stringify(filters)], previous data kept
export function useRecordComplianceAct(): UseMutationResult<BindingAct, Error, ComplianceActRequest>
export function useActAsCco(): UseMutationResult<BindingAct, Error, PresenterItem>
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/handlers/__tests__/workspace-supervision-api.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

async function approvedV1() {
  const { body: detail } = await call('POST', '/proposals', 'user-001', { threadId: 'th-johnson-review', accountId: 'acc-002' })
  const fingerprint: string = detail.versions[0].fingerprint
  const { body: act } = await call('POST', '/acts', 'user-001', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint })
  return { approvalActId: act.id as string, fingerprint }
}
const release = (viewer: string, a: { approvalActId: string; fingerprint: string }, rationale = 'Reviewed.') =>
  call('POST', '/acts', viewer, { kind: 'release_orders', proposalId: 'prop-0001', approvalActId: a.approvalActId, fingerprint: a.fingerprint, rationale })

describe('supervision and archive endpoints', () => {
  it('firm viewers read the queue and the archive; a client is told neither exists; no viewer is 401', async () => {
    expect((await call('GET', '/supervision', 'user-001')).body.alerts).toHaveLength(5)
    expect((await call('GET', '/supervision', 'cco-001')).status).toBe(200)
    expect((await call('GET', '/archive', 'user-002')).body).toEqual({ entries: [], clients: [], dates: [] })
    expect((await call('GET', '/supervision', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/archive', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/archive?kind=bogus', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/supervision', undefined)).status).toBe(401)
  })

  it('refuses archive filters it cannot read', async () => {
    for (const query of ['kind=bogus', 'from=2026-2-1', 'to=yesterday', 'from=2026-02-26&to=2026-02-25']) {
      expect(await call('GET', `/archive?${query}`, 'user-001')).toMatchObject({ status: 400, body: { code: 'BAD_FILTER' } })
    }
    expect((await call('GET', '/archive?clientId=cli-999&kind=release_orders&from=2026-02-25&to=2026-02-25', 'user-001')).status).toBe(200)
  })
})

describe('compliance acts over HTTP', () => {
  it('compliance releases once; the advisor is refused 403; a malformed body is 400', async () => {
    const a = await approvedV1()
    expect(await release('user-001', a)).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
    expect(await call('POST', '/acts', 'cco-001', { kind: 'release_orders', proposalId: 'prop-0001', rationale: 'x' })).toMatchObject({ status: 400 })
    expect(await call('POST', '/acts', 'cco-001', { kind: 'dispose_alert', alertId: 'comp-002', outcome: 'maybe', fingerprint: 'X', rationale: 'x' })).toMatchObject({ status: 400 })
    expect(await release('cco-001', a, '   ')).toMatchObject({ status: 400, body: { code: 'RATIONALE_REQUIRED' } })
    const first = await release('cco-001', a)
    expect(first).toMatchObject({ status: 201, body: { kind: 'release_orders', actorId: 'cco-001', rationale: 'Reviewed.' } })
    expect(await release('cco-001', a)).toMatchObject({ status: 409, body: { code: 'ALREADY_RELEASED' } })
  })

  it('a client gets 404 for every compliance kind, any body, and for the shortcut', async () => {
    const a = await approvedV1()
    for (const body of [
      { kind: 'release_orders', proposalId: 'prop-0001', approvalActId: a.approvalActId, fingerprint: a.fingerprint, rationale: 'x' },
      { kind: 'return_to_advisor' }, { kind: 'escalate', proposalId: 'prop-0001' },
      { kind: 'dispose_alert', alertId: 'comp-002', outcome: 'approve', fingerprint: 'X', rationale: 'x' }, { kind: 'dispose_alert' },
      { kind: 'review_correspondence', messageId: 'msg-0001', outcome: 'reviewed', fingerprint: 'X', rationale: 'x' },
      { kind: 'bogus' }, {},
    ]) expect((await call('POST', '/acts', 'cli-001', body)).status, JSON.stringify(body)).toBe(404)
    expect((await call('POST', '/presenter/act-as-cco', 'cli-001', { item: { kind: 'orders', id: 'prop-0001' } })).status).toBe(404)
    expect((await call('POST', '/presenter/act-as-cco', 'cli-001', {})).status).toBe(404)
    expect(store().acts.map((x) => x.kind)).toEqual(['approve_proposal'])
  })
})

describe('the presenter shortcut', () => {
  it("records Mark's default release as cco-001, marked as the shortcut, pressed by the presenter", async () => {
    await approvedV1()
    const r = await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'orders', id: 'prop-0001' } })
    expect(r).toMatchObject({ status: 201, body: {
      kind: 'release_orders', actorId: 'cco-001', viaPresenter: { presenterId: 'user-001' },
      rationale: 'Reviewed the approved version, its legs, tax effect, pre-trade reading and repurchase restrictions. Released for execution.',
    } })
    expect(await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'orders', id: 'prop-0001' } })).toMatchObject({ status: 409, body: { code: 'NOT_AWAITING_RELEASE' } })
  })

  it('disposes of an alert with the default approval, and refuses Mark himself and a bad item', async () => {
    const r = await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'alert', id: 'comp-002' } })
    expect(r).toMatchObject({ status: 201, body: { kind: 'dispose_alert', outcome: 'approve', actorId: 'cco-001', viaPresenter: { presenterId: 'user-001' } } })
    expect(await call('POST', '/presenter/act-as-cco', 'cco-001', { item: { kind: 'alert', id: 'comp-003' } })).toMatchObject({ status: 400, body: { code: 'NOT_A_PRESENTER' } })
    expect((await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'nope', id: 'x' } })).status).toBe(400)
  })

  it("Robert's records stay his: only the send record, without provenance", async () => {
    await approvedV1()
    const { body: draft } = await call('POST', '/threads/th-robert/drafts/letter', 'user-001', { proposalId: 'prop-0001' })
    await call('POST', '/acts', 'user-001', { kind: 'send_to_client', draftId: draft.id })
    await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'orders', id: 'prop-0001' } })
    const messageId = store().acts.find((x) => x.kind === 'send_to_client')!.messageId!
    await call('POST', '/presenter/act-as-cco', 'user-001', { item: { kind: 'correspondence', id: messageId } })
    const { body: acts } = await call('GET', '/acts?threadId=th-robert', 'cli-001')
    expect(acts.map((x: { kind: string }) => x.kind)).toEqual(['send_to_client'])
    expect(JSON.stringify(acts)).not.toMatch(/viaPresenter|rationale|basis|editedBy/)
  })

  it('no record is edited or deleted', async () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) expect((await call(method, '/acts', 'cco-001', {})).status).toBe(405)
  })
})
```

Create `src/hooks/__tests__/use-workspace-supervision.test.tsx`:

```tsx
import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useActAsCco, useSupervision } from '@/hooks/use-workspace'
import { approveProposal, createProposal } from '@/services/workspace'

it('the shortcut refreshes the queue and marks every query stale, accounts and positions included', async () => {
  const detail = await createProposal('user-001', 'th-johnson-review', 'acc-002')
  await approveProposal('user-001', detail.id, 1, detail.versions[0]!.fingerprint)
  const client = createTestQueryClient()
  client.setQueryData(['positions', 'acc-002'], [])
  client.setQueryData(['account', 'acc-002'], {})
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({ queue: useSupervision(), shortcut: useActAsCco() }), { wrapper })
  await waitFor(() => expect(result.current.queue.data?.orders).toHaveLength(1))
  await act(() => result.current.shortcut.mutateAsync({ kind: 'orders', id: detail.id }))
  await waitFor(() => expect(result.current.queue.data?.orders).toEqual([]))
  expect(client.getQueryState(['positions', 'acc-002'])?.isInvalidated).toBe(true)
  expect(client.getQueryState(['account', 'acc-002'])?.isInvalidated).toBe(true)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-supervision-api.test.ts src/hooks/__tests__/use-workspace-supervision.test.tsx --testTimeout 30000`
Expected: FAIL — the endpoints answer `405`/`400 NOT_IN_PHASE`; the hooks do not exist.

- [ ] **Step 3: The presenter shortcut**

Create `src/mocks/workspace/presenter.ts`:

```ts
import type { PresenterItem, SupervisionItemKind } from '@/types/workspace-supervision'
import { CCO_ID, personById } from '@/mocks/data/people'
import { activeApproval } from '@/mocks/data/proposals-store'
import { alertById, alertFingerprint } from './alerts'
import { disposeAlert, releaseOrders, reviewCorrespondence, type ComplianceFailure, type Recorded } from './compliance-acts'
import { sentMessage } from './correspondence'
import { visibleProposal } from './proposal-acts'
import { canSeeThread } from './visibility'

/** What Mark writes when the presenter acts for him: the review his default disposition rests on. */
export const CCO_DEFAULT_RATIONALE: Readonly<Record<SupervisionItemKind, string>> = {
  orders: 'Reviewed the approved version, its legs, tax effect, pre-trade reading and repurchase restrictions. Released for execution.',
  alert: 'Reviewed the alert, its record trail and the account context. Approved.',
  correspondence: 'Reviewed the message as the client received it, with its provenance. No follow-up needed.',
}

const refuse = (status: ComplianceFailure['status'], code: string, message: string): ComplianceFailure => ({ ok: false, status, code, message })

/**
 * The one-presenter demo: Mark's default disposition of an item the presenter can see, recorded as
 * Mark (`cco-001`) with the firm-only `viaPresenter` marker naming who pressed it.
 */
export function actAsCco(presenterId: string, item: PresenterItem): Recorded | ComplianceFailure {
  const presenter = personById(presenterId)
  if (!presenter || presenter.role === 'client') return refuse(404, 'NOT_FOUND', 'Not found.')
  const cco = personById(CCO_ID)
  if (!cco) throw new Error('The directory has no compliance officer')
  if (presenterId === CCO_ID) return refuse(400, 'NOT_A_PRESENTER', `You are viewing as ${cco.name}; record the disposition in Supervision.`)
  const options = { viaPresenter: { presenterId } }
  switch (item.kind) {
    case 'orders': {
      const proposal = visibleProposal(presenterId, item.id)
      if (!proposal) return refuse(404, 'NO_PROPOSAL', 'Proposal not found.')
      const active = activeApproval(proposal.id)
      if (!active) return refuse(409, 'NOT_AWAITING_RELEASE', 'Nothing from this proposal is awaiting release.')
      return releaseOrders(CCO_ID, proposal.id, active.actId, active.fingerprint, CCO_DEFAULT_RATIONALE.orders, options)
    }
    case 'alert': {
      const alert = alertById(item.id)
      if (!alert) return refuse(404, 'NO_ALERT', 'Alert not found.')
      return disposeAlert(CCO_ID, alert.id, 'approve', alertFingerprint(alert), CCO_DEFAULT_RATIONALE.alert, options)
    }
    case 'correspondence': {
      const sent = sentMessage(item.id)
      if (!sent || !canSeeThread(presenterId, sent.thread)) return refuse(404, 'NO_MESSAGE', 'Message not found.')
      return reviewCorrespondence(CCO_ID, sent.message.id, 'reviewed', sent.act.fingerprint, CCO_DEFAULT_RATIONALE.correspondence, options)
    }
  }
}
```

- [ ] **Step 4: The handlers**

Create `src/mocks/handlers/workspace-supervision.ts`:

```ts
import { http, HttpResponse } from 'msw'
import type { ArchiveFilters, ComplianceActRequest, PresenterItem } from '@/types/workspace-supervision'
import { archiveFor, isArchiveKind } from '../workspace/archive'
import { isAlertOutcome } from '../workspace/alerts'
import { disposeAlert, escalate, releaseOrders, returnToAdvisor, reviewCorrespondence, type ComplianceFailure, type Recorded } from '../workspace/compliance-acts'
import { isCorrespondenceOutcome } from '../workspace/correspondence'
import { actAsCco } from '../workspace/presenter'
import { supervisionQueue } from '../workspace/supervision'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal } from './workspace-http'

const ITEM_KINDS: ReadonlySet<string> = new Set(['orders', 'alert', 'correspondence'])
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** A compliance act's body, checked for shape; the engine decides everything else. */
export function parseComplianceAct(body: Record<string, unknown>): { ok: true; request: ComplianceActRequest } | { ok: false; message: string } {
  const { kind, fingerprint, rationale } = body
  if (!nonEmptyString(fingerprint) || typeof rationale !== 'string') return { ok: false, message: 'fingerprint and rationale are required.' }
  switch (kind) {
    case 'release_orders':
    case 'return_to_advisor':
    case 'escalate':
      return nonEmptyString(body.proposalId) && nonEmptyString(body.approvalActId)
        ? { ok: true, request: { kind, proposalId: body.proposalId, approvalActId: body.approvalActId, fingerprint, rationale } }
        : { ok: false, message: 'proposalId and approvalActId are required.' }
    case 'dispose_alert':
      return nonEmptyString(body.alertId) && isAlertOutcome(body.outcome)
        ? { ok: true, request: { kind, alertId: body.alertId, outcome: body.outcome, fingerprint, rationale } }
        : { ok: false, message: 'alertId and an outcome of approve, reject or request_changes are required.' }
    case 'review_correspondence':
      return nonEmptyString(body.messageId) && isCorrespondenceOutcome(body.outcome)
        ? { ok: true, request: { kind, messageId: body.messageId, outcome: body.outcome, fingerprint, rationale } }
        : { ok: false, message: 'messageId and an outcome of reviewed or flagged are required.' }
    default:
      return { ok: false, message: 'Unknown compliance act.' }
  }
}

export function recordComplianceAct(viewerId: string, r: ComplianceActRequest): Recorded | ComplianceFailure {
  switch (r.kind) {
    case 'release_orders': return releaseOrders(viewerId, r.proposalId, r.approvalActId, r.fingerprint, r.rationale)
    case 'return_to_advisor': return returnToAdvisor(viewerId, r.proposalId, r.approvalActId, r.fingerprint, r.rationale)
    case 'escalate': return escalate(viewerId, r.proposalId, r.approvalActId, r.fingerprint, r.rationale)
    case 'dispose_alert': return disposeAlert(viewerId, r.alertId, r.outcome, r.fingerprint, r.rationale)
    case 'review_correspondence': return reviewCorrespondence(viewerId, r.messageId, r.outcome, r.fingerprint, r.rationale)
  }
}

function archiveFilters(url: URL): { ok: true; filters: ArchiveFilters } | { ok: false; message: string } {
  const read = (key: string) => url.searchParams.get(key) || undefined
  const clientId = read('clientId')
  const kind = read('kind')
  const from = read('from')
  const to = read('to')
  if (kind !== undefined && !isArchiveKind(kind)) return { ok: false, message: `${kind} is not a kind of record.` }
  if ((from !== undefined && !ISO_DAY.test(from)) || (to !== undefined && !ISO_DAY.test(to))) return { ok: false, message: 'Dates are YYYY-MM-DD.' }
  if (from !== undefined && to !== undefined && from > to) return { ok: false, message: 'The from date is after the to date.' }
  return { ok: true, filters: { ...(clientId ? { clientId } : {}), ...(kind ? { kind } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) } }
}

const isPresenterItem = (value: unknown): value is PresenterItem =>
  typeof value === 'object' && value !== null && 'kind' in value && 'id' in value
  && typeof value.kind === 'string' && ITEM_KINDS.has(value.kind) && nonEmptyString(value.id)

/** Firm surfaces: a client gets 404 from each before anything about the request is checked. */
export const workspaceSupervisionHandlers = [
  http.get('/api/workspace/supervision', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const queue = supervisionQueue(viewer.viewerId)
    return queue ? HttpResponse.json(queue) : notFound()
  }),

  http.get('/api/workspace/archive', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const parsed = archiveFilters(new URL(request.url))
    if (!parsed.ok) return HttpResponse.json({ code: 'BAD_FILTER', message: parsed.message }, { status: 400 })
    const archive = archiveFor(viewer.viewerId, parsed.filters)
    return archive ? HttpResponse.json(archive) : notFound()
  }),

  http.post('/api/workspace/presenter/act-as-cco', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const item = (await readJson(request))?.item
    if (!isPresenterItem(item)) return badRequest('item must name a kind (orders, alert or correspondence) and an id.')
    const r = actAsCco(viewer.viewerId, item)
    return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
  }),
]
```

In `src/mocks/handlers/workspace.ts`:

- `POST /api/workspace/acts`: right after the viewer check, `if (personById(viewer)?.role === 'client') return notFound()` (and drop the later `isClient` checks, now unreachable); add before `default:`:

```ts
      case 'release_orders':
      case 'return_to_advisor':
      case 'escalate':
      case 'dispose_alert':
      case 'review_correspondence': {
        const parsed = parseComplianceAct(body)
        if (!parsed.ok) return badRequest(parsed.message)
        const r = recordComplianceAct(viewer, parsed.request)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
```

  and change the `default:` message to `'That is not a recorded act.'` (code `UNKNOWN_ACT`, status 400).
- `GET /api/workspace/acts`: a client sees `acts.filter((a) => a.kind === 'send_to_client').map(withoutProvenance)`; `withoutProvenance` also drops `viaPresenter` and `rationale`:

```ts
const withoutProvenance = ({ subject: _subject, basis: _basis, editedBy: _editedBy, viaPresenter: _via, rationale: _rationale, ...act }: BindingAct): BindingAct => act
```

- register `...workspaceSupervisionHandlers` next to `...workspaceProposalHandlers`, above the catch-all.

- [ ] **Step 5: Services and hooks**

Append to `src/services/workspace.ts` (types from `@/types/workspace-supervision`):

```ts
export const recordComplianceAct = (viewer: string, request: ComplianceActRequest) =>
  post<BindingAct>('/workspace/acts', request, as(viewer))
export const getSupervision = (viewer: string) =>
  get<SupervisionQueue>('/workspace/supervision', undefined, as(viewer))
/** Only the filters that are set travel as query parameters. */
export const getArchive = (viewer: string, filters: ArchiveFilters) =>
  get<Archive>('/workspace/archive', Object.fromEntries(Object.entries(filters).filter((e): e is [string, string] => typeof e[1] === 'string')), as(viewer))
/** The presenter shortcut: Mark's default disposition, recorded as Mark with the shortcut marked. */
export const actAsCco = (viewer: string, item: PresenterItem) =>
  post<BindingAct>('/workspace/presenter/act-as-cco', { item }, as(viewer))
```

Append to `src/hooks/use-workspace.ts`:

```ts
export function useSupervision() {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'supervision'], queryFn: () => api.getSupervision(viewerId) })
}

export function useArchive(filters: ArchiveFilters) {
  const { viewerId } = useViewer()
  return useQuery({
    queryKey: ['workspace', viewerId, 'archive', JSON.stringify(filters)],
    queryFn: () => api.getArchive(viewerId, filters),
    placeholderData: keepPreviousData,
  })
}

/** A compliance act can move the book (a release fills): accounts, positions, drift and lots are stale too, not only the workspace. */
function useInvalidateEverything() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}

export function useRecordComplianceAct() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateEverything()
  return useMutation({ mutationFn: (request: ComplianceActRequest) => api.recordComplianceAct(viewerId, request), onSettled: invalidate })
}

export function useActAsCco() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateEverything()
  return useMutation({ mutationFn: (item: PresenterItem) => api.actAsCco(viewerId, item), onSettled: invalidate })
}
```

(import `ArchiveFilters`, `ComplianceActRequest`, `PresenterItem` from `@/types/workspace-supervision`).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-supervision-api.test.ts src/hooks/__tests__/use-workspace-supervision.test.tsx src/mocks/handlers/__tests__/workspace-proposals-api.test.ts src/mocks/handlers/__tests__/workspace-write.test.ts --testTimeout 30000`
Expected: PASS (the Phase 3 "a client gets 404 from every proposal and letter endpoint" test still passes: every `/acts` body from a client is 404). Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/workspace/presenter.ts src/mocks/handlers src/services/workspace.ts src/hooks/use-workspace.ts src/hooks/__tests__/use-workspace-supervision.test.tsx
git commit -m "feat(compliance): supervision, archive and presenter endpoints; compliance acts over /acts; hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The Proposal Agent harvests and substitutes instead of foreclosing a flagged harvest

Phase 3 carry-over (final-review I5): when a buy would foreclose a harvest the Harvest Scanner flags for the taxpayer, the agent buys a non-identical substitute in the same class under the existing substitution rules (`substituteBuyCandidate`: the model's own implementation security, then what the account holds in the class) and, when the flagged loss sits in this account, harvests it now — its loss lots only — putting the proceeds into the substitute. Where the class has no such substitute, the buy stands and the agent keeps saying what it forecloses.

**Ruling this task carries:** "Non-identical" keeps the engine's existing meaning (a different symbol; `wash-sale.ts`), and a substitute may not itself be a flagged harvest or a washing symbol. For acc-002 the class has no such substitute — the model's fixed-income security is AGG itself and AGG is the only fixed income held — so the story's legs, summaries and Phase 3 baselines are unchanged; the rule acts in the book where a substitute exists (acc-043: harvest CSBGU0.SW, buy the model's AGG). The substitution is how a version names a harvest's replacement (Task 3 records it on the realised sale).

**Files:**
- Modify: `src/mocks/handlers/oms.ts` (`GenerationConstraints`, `generateRebalanceProposal`), `src/mocks/workspace/proposal-engine.ts` (`buildVersion`), `src/mocks/agents/proposal-agent.ts`
- Test: `src/mocks/workspace/__tests__/harvest-substitution.test.ts` (new)

**Interfaces:**
- Consumes: `HarvestSubstitution` (Task 1); `harvestOpportunities` from `@/mocks/agents/harvest-scanner`; `sameWashSaleTaxpayer`.
- Produces:

```ts
// src/mocks/handlers/oms.ts
export type GenerationConstraints = { …; /** Securities the Harvest Scanner flags for the taxpayer: a buy of one moves to a substitute where the class has one. */ protectHarvests?: ReadonlySet<string> }
export type GeneratedProposal = RebalanceProposal & { harvestSubstitutions: HarvestSubstitution[] }
export function generateRebalanceProposal(…): GeneratedProposal

// src/mocks/agents/proposal-agent.ts
export function harvestSubstitutionSentence(built: DraftPreview): string
```

- [ ] **Step 1: Write the failing test**

Create `src/mocks/workspace/__tests__/harvest-substitution.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { DraftPreview } from '@/types/workspace-proposal'
import { accounts } from '@/mocks/data/accounts'
import { harvestOpportunities } from '@/mocks/agents/harvest-scanner'
import { agentConstraints, draftSummary } from '@/mocks/agents/proposal-agent'
import { sameWashSaleTaxpayer } from '@/mocks/handlers/tax-return'
import { buildVersion } from '../proposal-engine'

const built = (accountId: string): DraftPreview => {
  const r = buildVersion(accountId, agentConstraints([]), [])
  if (!r.ok) throw new Error(`${accountId}: ${r.message}`)
  return r.built
}
const flaggedFor = (accountId: string) => new Set(sameWashSaleTaxpayer(accounts.find((a) => a.id === accountId)!).flatMap(harvestOpportunities).map((o) => o.position.symbol))

describe('harvest-plus-substitute', () => {
  it("acc-043 harvests its CSBGU0.SW loss and buys the model's AGG in its place", () => {
    const v = built('acc-043')
    expect(v.harvestSubstitutions).toEqual([{
      assetClass: 'fixed_income', foreclosed: { symbol: 'CSBGU0.SW', name: expect.any(String) },
      bought: { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF' }, harvested: true,
    }])
    const sell = v.preview.trades.find((t) => t.symbol === 'CSBGU0.SW')
    expect(sell?.side).toBe('sell')
    expect(sell!.realisedShortTerm + sell!.realisedLongTerm).toBeLessThan(0)
    expect(v.legFacts.find((f) => f.symbol === 'CSBGU0.SW')!.lots.every((t) => t.realised <= 0)).toBe(true)
    expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === 'AGG')).toBe(true)
    expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === 'CSBGU0.SW')).toBe(false)
    const summary = draftSummary('acc-043', v)
    expect(summary).toContain('lots at a loss and buys iShares Core US Aggregate Bond ETF in their place, so that harvest is not foreclosed.')
    expect(summary).not.toMatch(/\d/)
  })

  it('acc-002 has no non-identical fixed-income substitute: the AGG buy stands and the agent says what it forecloses', () => {
    const v = built('acc-002')
    expect(v.harvestSubstitutions).toEqual([])
    expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === 'AGG')).toBe(true)
    expect(draftSummary('acc-002', v)).toContain('iShares Core US Aggregate Bond ETF is bought here, so its loss cannot be harvested for thirty days without a wash sale.')
  })

  it('across the book, a substitute is never a flagged harvest, and a harvest sells only loss lots', () => {
    let substituted = 0
    for (const account of accounts) {
      const v = built(account.id)
      const flagged = flaggedFor(account.id)
      for (const s of v.harvestSubstitutions) {
        substituted += 1
        expect(flagged.has(s.bought.symbol), `${account.id} buys flagged ${s.bought.symbol}`).toBe(false)
        expect(v.preview.trades.some((t) => t.side === 'buy' && t.symbol === s.foreclosed.symbol), `${account.id} still buys ${s.foreclosed.symbol}`).toBe(false)
        if (s.harvested) expect(v.legFacts.find((f) => f.symbol === s.foreclosed.symbol)!.lots.every((t) => t.realised <= 0), account.id).toBe(true)
      }
    }
    expect(substituted).toBeGreaterThan(0)
  }, 120_000)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/mocks/workspace/__tests__/harvest-substitution.test.ts --testTimeout 30000`
Expected: FAIL — `harvestSubstitutions` is always `[]` (Task 1 placeholder value), so acc-043's expectation and `substituted > 0` fail.

- [ ] **Step 3: The engine rule**

In `src/mocks/handlers/oms.ts`: import `type HarvestSubstitution` from `@/types/workspace-proposal`; add to `GenerationConstraints`:

```ts
  /**
   * Securities the Harvest Scanner flags for the account's wash-sale taxpayer. A buy of one would
   * foreclose its harvest (a sale of its loss lots within thirty days would be washed), so the buy
   * moves to a non-identical substitute in the class where one exists, and a loss held here is harvested.
   */
  protectHarvests?: ReadonlySet<string>
```

add after `RebalanceProposal`:

```ts
/** A generated proposal, with the harvests it kept open by buying a substitute. */
export type GeneratedProposal = RebalanceProposal & { harvestSubstitutions: HarvestSubstitution[] }
```

and change `generateRebalanceProposal`'s return type to `GeneratedProposal` (its early return gains `harvestSubstitutions: []`). In its body, replace the block from `const lossSold = taxable` through the end of `const raw = drafted.map(…)` with:

```ts
  // Phase 4 · a buy of a security the Harvest Scanner flags for this taxpayer forecloses that harvest.
  // Where the class has a non-identical substitute that is neither flagged nor washing, the substitute
  // is bought instead; a loss this account holds in the flagged security is harvested now, its loss
  // lots only, and its proceeds go to the substitute. With no substitute the buy stands.
  const protectedHarvests: ReadonlySet<string> = taxable ? constraints.protectHarvests ?? new Set<string>() : new Set<string>()
  const lossSoldIn = (legs: readonly RawLeg[]) => (taxable
    ? legs.filter((l) => l.side === 'sell' && l.target.position && saleOf(l.target.position, l.notional).soldLosses.length > 0).map((l) => l.target.symbol)
    : [])
  const harvestSubstitutions: HarvestSubstitution[] = []
  const withHarvests = drafted.flatMap((leg): RawLeg[] => {
    if (leg.side !== 'buy' || !protectedHarvests.has(leg.target.symbol)) return [leg]
    const held = positions.filter((p) => p.assetClass === leg.sleeve.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
    const avoid = new Set([...protectedHarvests, ...washingSymbols(lossWindows, lossSoldIn(drafted))])
    const substitute = substituteBuyCandidate(held, drift.modelId, leg.sleeve.assetClass, currency, avoid)
    if (!substitute) return [leg]
    const lossHolding = positions.find((p) => p.symbol === leg.target.symbol && isMarketTradable(p.symbol) && lossValueOf(p) > 0)
    const harvest = lossHolding && !drafted.some((l) => l.side === 'sell' && l.target.symbol === leg.target.symbol) ? lossHolding : undefined
    harvestSubstitutions.push({
      assetClass: leg.sleeve.assetClass, foreclosed: { symbol: leg.target.symbol, name: leg.target.name },
      bought: { symbol: substitute.symbol, name: substitute.name }, harvested: harvest !== undefined,
    })
    if (!harvest) return [{ ...leg, substitute }]
    const notional = lossValueOf(harvest)
    return [
      { target: { symbol: harvest.symbol, name: harvest.name, price: harvest.price, position: harvest }, side: 'sell', notional, sleeve: leg.sleeve },
      { ...leg, notional: leg.notional + notional, substitute },
    ]
  })

  // A buy of a symbol the taxpayer has an open loss window on, or that this proposal sells at a
  // loss, is the replacement purchase §1091 looks for. Only a taxable account's sale realises a loss.
  const lossSold = lossSoldIn(withHarvests)
  const washing = constraints.avoidSelfWash ? washingSymbols(lossWindows, lossSold) : new Set<string>()
  // A washing buy moves to a substitute in the same class; only a class with none is held back.
  // A buy already moved to a substitute above keeps it.
  const raw = withHarvests.map((leg): RawLeg => {
    if (leg.side !== 'buy' || leg.substitute || !washing.has(leg.target.symbol)) return leg
    const held = positions.filter((p) => p.assetClass === leg.sleeve.assetClass && p.symbol !== 'CASH' && isMarketTradable(p.symbol))
    const substitute = substituteBuyCandidate(held, drift.modelId, leg.sleeve.assetClass, currency, washing)
    if (substitute) return { ...leg, substitute }
    heldBack.set(leg.sleeve.assetClass, 'wash_sale_avoided')
    return { ...leg, parked: true }
  })
```

and the final `return` becomes:

```ts
  const traded = (side: 'buy' | 'sell', symbol: string) => resolved.legs.some((l) => l.side === side && l.symbol === symbol)
  return {
    legs: resolved.legs, sales: resolved.sales, heldBack,
    harvestSubstitutions: harvestSubstitutions.filter((s) => traded('buy', s.bought.symbol) && (!s.harvested || traded('sell', s.foreclosed.symbol))),
  }
```

In `src/mocks/workspace/proposal-engine.ts`: import `harvestOpportunities` from `@/mocks/agents/harvest-scanner` and `sameWashSaleTaxpayer` from `@/mocks/handlers/tax-return`; add

```ts
/** What the Harvest Scanner flags for the account's wash-sale taxpayer: buying one of these forecloses its harvest. */
function flaggedHarvests(account: Account): Set<string> {
  return new Set(sameWashSaleTaxpayer(account).flatMap(harvestOpportunities).map((o) => o.position.symbol))
}
```

and in `buildVersion` generate with it under the agent's own rule, then keep only the substitutions the edits left standing:

```ts
  const avoidsWash = constraints.some((c) => c.kind === 'avoid_self_wash')
  const generated = generateRebalanceProposal(accountId, true, PROPOSAL_DRIFT_THRESHOLD, undefined, {
    ...generationConstraintsOf(constraints), ...(avoidsWash ? { protectHarvests: flaggedHarvests(account) } : {}),
  })
```

```ts
  const traded = (side: 'buy' | 'sell', symbol: string) => preview.trades.some((t) => t.side === side && t.symbol === symbol)
  const harvestSubstitutions = generated.harvestSubstitutions.filter((s) => traded('buy', s.bought.symbol) && (!s.harvested || traded('sell', s.foreclosed.symbol)))
```

replacing Task 1's `harvestSubstitutions: []` in `built` with `harvestSubstitutions`.

In `src/mocks/agents/proposal-agent.ts` add, and use in both summaries:

```ts
/** What the agent did instead of foreclosing a flagged harvest, in words with no digits. */
export function harvestSubstitutionSentence(built: DraftPreview): string {
  return built.harvestSubstitutions.map((s) => {
    const foreclosed = claimNameOf(s.foreclosed.symbol, s.foreclosed.name)
    const bought = claimNameOf(s.bought.symbol, s.bought.name)
    return s.harvested
      ? ` It sells the ${foreclosed} lots at a loss and buys ${bought} in their place, so that harvest is not foreclosed.`
      : ` It buys ${bought} rather than ${foreclosed}, so the taxpayer's ${foreclosed} harvest is not foreclosed.`
  }).join('')
}
```

- `draftSummary`: both branches end `` `…it ${NO_SELF_WASH}.${harvestSubstitutionSentence(built)}${foreclosedHarvestCaveat(accountId, built)}` `` (the tax-advantaged branch likewise);
- `revisionSummary`: `` `${opening(…)}${cap}${bandResult(built)}${harvestSubstitutionSentence(built)}${foreclosedHarvestCaveat(built.preview.accountId, built)}${carried}` ``;
- `foreclosedHarvestCaveat`'s doc comment: "The engine buys a substitute where the class has one (`harvestSubstitutions`); a flagged buy that remains has none, so the agent says what it forecloses."

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/harvest-substitution.test.ts src/mocks/workspace/__tests__/proposal-engine.test.ts src/mocks/workspace/__tests__/proposals.test.ts src/mocks/workspace/__tests__/whole-book-release.test.ts src/mocks/handlers/__tests__/self-wash-substitution.test.ts src/mocks/handlers/__tests__/constrained-generation.test.ts --testTimeout 30000`
Expected: PASS — acc-002's Phase 3 expectations (legs, fingerprints, summaries) are unchanged. If acc-043 does not produce the substitution, print `built('acc-043').preview.trades` and the account's flagged set before changing anything, and report the difference: the expectation comes from the fixture scan in this plan's rulings, and a different result is a finding, not a test to rewrite. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 5: Commit**

```bash
git add src/mocks/handlers/oms.ts src/mocks/workspace/proposal-engine.ts src/mocks/agents/proposal-agent.ts src/mocks/workspace/__tests__/harvest-substitution.test.ts
git commit -m "feat(proposal-agent): harvest the flagged loss and buy a non-identical substitute instead of foreclosing it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The team thread after release, and the presenter shortcut

As Adrian, after compliance releases: Mark's record slip (with his rationale, and the shortcut noted when it was used), then the fills message, and the approval panel reads "Filled" with what filled. Beside pending staged orders, Adrian has the presenter shortcut `Demo · act as Mark Davis`, with a confirm step like every binding act. A filled proposal's workbench is closed and its Revise action gone; asking the Proposal Agent again drafts the next proposal.

**Rulings this task carries:** the shortcut shows only to the presenter (`DEFAULT_VIEWER_ID`, Adrian) — the one person who acts live — never to Mark (who records in Supervision) or to other firm viewers. Compliance provenance lines (rationale, shortcut) are firm-only and never rendered for a client.

**Files:**
- Create: `src/workspace/context/PresenterRelease.tsx`, `src/workspace/thread/act-provenance.ts`
- Modify: `src/workspace/context/ApprovalPanel.tsx`, `src/workspace/thread/ActRecordSlip.tsx`, `src/workspace/workbench/Workbench.tsx`, `src/workspace/context/ProposalAgentControl.tsx`, `src/workspace/thread/MessageView.tsx` (`ReviseAction`)
- Test: `src/workspace/__tests__/after-release.test.tsx` (new)

**Interfaces:**
- Consumes: `useActAsCco` (Task 8); `ProposalDetail.fills`, `escalation`, the `released` approval state (Task 1); `FILL_SIDE_WORDS` (Task 1); `DEFAULT_VIEWER_ID` from `@/workspace/viewer/viewer-context`.
- Produces:

```ts
// src/workspace/thread/act-provenance.ts
export function actProvenance(act: BindingAct, directory: Directory): string[]   // "Rationale · …", "Demo · recorded through the presenter shortcut by …"
// src/workspace/context/PresenterRelease.tsx
export function PresenterRelease(props: { proposalId: string; version: number; directory: Directory; onRecorded: (actId: string) => void }): JSX.Element | null
```

Exact strings: button `Demo · act as Mark Davis` (built from the directory's compliance person); its note `Presenter shortcut: records Mark Davis's release with the default compliance rationale, marked as made through this shortcut.`; dialog title `Release v{n} as Mark Davis?`, description `The record names Mark Davis as the actor and notes the presenter shortcut.`; filled block `FILLED` · `Released by compliance; filled at the day's prices.` · `Filled from v{n} · released by {REC id}`; escalated `ESCALATED` · `Held by compliance for further review.`; returned `Compliance returned v{n} ({REC id}). Revise it, or approve it again, to stage new orders.`; workbench `The orders from v{n} were filled. This proposal is closed; ask the Proposal Agent for a new one from the moved book.`

- [ ] **Step 1: Write the failing test**

Create `src/workspace/__tests__/after-release.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, recordComplianceAct } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const RELEASED = 'Released the orders staged from v1 of the Johnson rebalance'

async function approved() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  const act = await approveProposal(ADRIAN, detail.id, 1, detail.versions[0]!.fingerprint)
  return { proposalId: detail.id, approvalActId: act.id, fingerprint: detail.versions[0]!.fingerprint }
}
async function releasedByMark() {
  const a = await approved()
  await recordComplianceAct('cco-001', { kind: 'release_orders', ...a, rationale: 'Reviewed the legs and the pre-trade reading.' })
  return a
}
async function openThread() {
  renderRoutes(routes, '/t/th-johnson-review')
  await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
  return inContext().findByRole('region', { name: 'Approval · Johnson rebalance' })
}

describe('the team thread after compliance releases', () => {
  it("shows Mark's slip with his rationale, then the fills; the approval panel reads Filled and offers nothing to approve", async () => {
    await releasedByMark()
    const panel = await openThread()
    const slip = await conversation().findByRole('article', { name: RELEASED })
    expect(slip).toHaveTextContent('Mark Davis, Compliance')
    expect(slip).toHaveTextContent('Rationale · Reviewed the legs and the pre-trade reading.')
    expect(slip).not.toHaveTextContent('presenter shortcut')
    const fills = conversation().getByRole('article', { name: 'Fills · Johnson rebalance v1' })
    expect(within(fills).getByRole('table', { name: 'Fills · v1' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('v1 was released by compliance and filled')
    expect(panel).toHaveTextContent('Filled from v1 · released by REC-0002')
    expect(within(panel).getByRole('list', { name: 'Filled orders' })).toHaveTextContent('Sold 7,000 INTC at 28.45')
    expect(within(panel).queryByRole('button')).toBeNull()
    expect(conversation().queryByRole('button', { name: 'Revise' })).toBeNull()
  })

  it('the presenter shortcut releases as Mark, once, with the shortcut on the record, and focus goes to the slip', async () => {
    await approved()
    const panel = await openThread()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('button', { name: 'Demo · act as Mark Davis' }))
    const dialog = screen.getByRole('dialog', { name: 'Release v1 as Mark Davis?' })
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    const slip = await inContext().findByRole('article', { name: RELEASED })
    expect(slip).toHaveTextContent('Mark Davis, Compliance')
    expect(slip).toHaveTextContent('Demo · recorded through the presenter shortcut by Adrian Hale')
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0002')))
    expect(store().acts.filter((a) => a.kind === 'release_orders')).toHaveLength(1)
  })

  it('Mark and Sarah see no shortcut', async () => {
    await approved()
    for (const viewer of ['cco-001', 'user-002']) {
      viewAsOnLoad(viewer)
      const { unmount } = renderRoutes(routes, '/t/th-johnson-review')
      const panel = await inContext().findByRole('region', { name: 'Approval · Johnson rebalance' })
      expect(within(panel).queryByRole('button', { name: 'Demo · act as Mark Davis' })).toBeNull()
      unmount()
    }
  })

  it('an escalation reads as such in the panel', async () => {
    const a = await approved()
    await recordComplianceAct('cco-001', { kind: 'escalate', ...a, rationale: 'Needs the investment committee.' })
    const panel = await openThread()
    expect(panel).toHaveTextContent('ESCALATED')
    expect(panel).toHaveTextContent('Held by compliance for further review.')
  })

  it('a filled proposal\'s workbench is closed; asking the Proposal Agent again drafts "Johnson rebalance 2"', async () => {
    await releasedByMark()
    const { unmount } = renderRoutes(routes, '/proposals/prop-0001?from=th-johnson-review')
    await screen.findByRole('heading', { level: 1, name: 'Johnson rebalance' })
    expect(screen.getByText('The orders from v1 were filled. This proposal is closed; ask the Proposal Agent for a new one from the moved book.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Draft version' })).toBeNull()
    unmount()
    await openThread()
    await userEvent.setup().click(inContext().getByRole('button', { name: 'Ask Proposal Agent' }))
    expect(await screen.findByRole('region', { name: 'Proposal · Johnson rebalance 2' })).toBeInTheDocument()
    expect(await inContext().findByText('Proposal Agent posted v1 in the thread.')).toBeInTheDocument()
  })
})

describe('the account view after the fills', () => {
  it('shows the moved holdings: no INTC, and the positions the fills opened', async () => {
    await releasedByMark()
    renderRoutes(routes, '/accounts/acc-002?from=th-johnson-review')
    const holdings = await screen.findByRole('table', { name: 'Holdings' })
    const symbols = within(holdings).getAllByRole('row').map((r) => r.querySelector('td')?.textContent)
    expect(symbols).not.toContain('INTC')
    expect(symbols).toContain('VWO')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/workspace/__tests__/after-release.test.tsx --testTimeout 30000`
Expected: FAIL — no rationale on the slip, no filled block, no shortcut button.

- [ ] **Step 3: Provenance on the slip**

Create `src/workspace/thread/act-provenance.ts`:

```ts
import type { BindingAct, Directory } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

/** The firm's record of how a compliance act was made: its rationale, and the presenter shortcut when it was used. */
export function actProvenance(act: BindingAct, directory: Directory): string[] {
  return [
    ...(act.rationale ? [`Rationale · ${act.rationale}`] : []),
    ...(act.viaPresenter ? [`Demo · recorded through the presenter shortcut by ${personIn(directory, act.viaPresenter.presenterId).name}`] : []),
  ]
}
```

In `src/workspace/thread/ActRecordSlip.tsx` (import `actProvenance`):

```tsx
  const origin = viewerIsClient ? undefined : sentLetterOrigin(act, directory)
  // Firm-only: a client's slip never carries the firm's provenance.
  const lines = viewerIsClient ? [] : [...(origin ? [origin] : []), ...actProvenance(act, directory)]
  return (
    <RecordSlip kind={kind} title={title} recordId={act.id} fingerprint={act.fingerprint}
      recordedBy={{ name: actor.name, role: ROLE_LABEL[actor.role] }} at={act.at} archive={archive}>
      {lines.length > 0 ? (
        <span className="flex flex-col gap-1 text-label text-ink-2">
          {lines.map((line) => <span key={line} className="whitespace-pre-line">{line}</span>)}
        </span>
      ) : undefined}
    </RecordSlip>
  )
```

- [ ] **Step 4: The presenter shortcut**

Create `src/workspace/context/PresenterRelease.tsx`:

```tsx
import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { useActAsCco } from '@/hooks/use-workspace'
import type { Directory } from '@/types/workspace'

type PresenterReleaseProps = { proposalId: string; version: number; directory: Directory; onRecorded: (actId: string) => void }

/**
 * The one-presenter demo's shortcut: compliance's default release of these orders, recorded as the
 * compliance officer with the record noting the shortcut. A binding act, so it confirms first.
 */
export function PresenterRelease({ proposalId, version, directory, onRecorded }: PresenterReleaseProps) {
  const shortcut = useActAsCco()
  const [open, setOpen] = useState(false)
  const [slipTakesFocus, setSlipTakesFocus] = useState(false)
  // A ref, not render state, so a second click in the same frame cannot record a second release.
  const busy = useRef(false)
  const noteId = useId()
  const cco = directory.people.find((p) => p.role === 'compliance')
  if (!cco) return null
  const close = () => {
    if (shortcut.isPending) return
    shortcut.reset()
    setOpen(false)
  }
  const confirm = () => {
    if (busy.current) return
    busy.current = true
    shortcut.mutate({ kind: 'orders', id: proposalId }, {
      onSuccess: (act) => { setSlipTakesFocus(true); setOpen(false); onRecorded(act.id) },
      onSettled: () => { busy.current = false },
    })
  }
  return (
    <div className="flex flex-col items-start gap-2 border-t border-dashed border-rule-2 pt-3">
      <Button rank="secondary" aria-describedby={noteId} onClick={() => { shortcut.reset(); setSlipTakesFocus(false); setOpen(true) }}>
        {`Demo · act as ${cco.name}`}
      </Button>
      <p id={noteId} className="text-label text-ink-3">
        {`Presenter shortcut: records ${cco.name}'s release with the default compliance rationale, marked as made through this shortcut.`}
      </p>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close() }} returnFocus={!slipTakesFocus}
        title={`Release v${version} as ${cco.name}?`} description={`The record names ${cco.name} as the actor and notes the presenter shortcut.`}>
        <div className="flex flex-col gap-4">
          {shortcut.isError ? <p role="alert" className="text-body">{shortcut.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={shortcut.isPending} onClick={close}>Cancel</Button>
            <Button disabled={shortcut.isPending} onClick={confirm}>Confirm</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 5: The approval panel after compliance acts**

In `src/workspace/context/ApprovalPanel.tsx` (imports: `fmtPrice`; `FILL_SIDE_WORDS`; `DEFAULT_VIEWER_ID` from `@/workspace/viewer/viewer-context`; `PresenterRelease` from `./PresenterRelease`; `Fill` type):

- `canApprove` becomes `permissions.includes('approve_proposal') && approval.kind !== 'released' && !isApprovedLatest(approval)`;
- after `const pending = …` add:

```ts
  const returned = approval.kind === 'unapproved' ? detail.staged.filter((o) => o.status === 'returned').at(-1) : undefined
  // The one presenter acts for compliance through a labelled shortcut; compliance itself records in Supervision.
  const presents = viewerId === DEFAULT_VIEWER_ID && !permissions.includes('release_orders')
```

- replace `{pending.length > 0 ? <StagedOrders orders={pending} /> : null}` with:

```tsx
      {pending.length > 0 ? <StagedOrders orders={pending} escalated={detail.escalation !== undefined} /> : null}
      {pending.length > 0 && presents && pending[0] ? <PresenterRelease proposalId={detail.id} version={pending[0].version} directory={directory} onRecorded={onRecorded} /> : null}
      {approval.kind === 'released' ? <FilledOrders fills={detail.fills} version={approval.version} releaseActId={approval.releaseActId} /> : null}
      {returned ? <p className="text-body text-ink-2">{`Compliance returned v${returned.version} (${returned.closedByActId ?? ''}). Revise it, or approve it again, to stage new orders.`}</p> : null}
```

- `StagedOrders` takes `escalated: boolean` and, after the PENDING line, shows it:

```tsx
      {escalated ? (
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone="solid">ESCALATED</Tag>
          <span className="text-ink-2">Held by compliance for further review.</span>
        </p>
      ) : null}
```

- add `FilledOrders` below `StagedOrders`:

```tsx
function FilledOrders({ fills, version, releaseActId }: { fills: Fill[]; version: number; releaseActId: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-3">
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone="solid">FILLED</Tag>
        <span className="text-ink-2">Released by compliance; filled at the day&apos;s prices.</span>
      </p>
      <p className="text-label text-ink-2">{`Filled from v${version} · released by ${releaseActId}`}</p>
      <ul aria-label="Filled orders" className="flex flex-col gap-1 text-body">
        {fills.map((f) => (
          <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>{`${FILL_SIDE_WORDS[f.side]} ${fmtQuantity(f.quantity)} ${f.symbol} at ${fmtPrice(f.price)}`}</span>
            <span className="tabular text-ink-2">{fmtMoney(f.value)} <span className="text-ink-3">{f.currency}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: The closed workbench, the next proposal, no Revise on a filled one**

`src/workspace/workbench/Workbench.tsx`: `const closed = detail.approval.kind === 'released'`; `const canEdit = !closed && thread.data !== undefined && canPostIn(thread.data.thread, viewerId, directory)`; after the "never approves" line render

```tsx
        {detail.approval.kind === 'released'
          ? <p className="text-body text-ink-2">{`The orders from v${detail.approval.version} were filled. This proposal is closed; ask the Proposal Agent for a new one from the moved book.`}</p>
          : null}
```

and show "You can read this proposal but not change it." only when `thread.data !== undefined && !canEdit && !closed`.

`src/workspace/context/ProposalAgentControl.tsx`: `const alreadyDrafted = (proposals.data ?? []).some((p) => p.accountId === subject.id && p.approval.kind !== 'released')`.

`src/workspace/thread/MessageView.tsx` `ReviseAction`: `if (!proposal.data || proposal.data.approval.kind === 'released') return null`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/after-release.test.tsx src/workspace/__tests__/approval.test.tsx src/workspace/__tests__/workbench-edit.test.tsx src/workspace/__tests__/thread.test.tsx --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 8: Commit**

```bash
git add src/workspace src/workspace/__tests__/after-release.test.tsx
git commit -m "feat(thread): after release — compliance's slip and rationale, fills, Filled; the presenter shortcut

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The Supervision route — queue beside the item, and the item's evidence

`/supervision` and `/supervision/:kind/:id` (`kind` is `orders`, `alert` or `correspondence`): the thread list steps aside as on the workbench, the dense queue sits on the left (three groups plus "Disposed today") and the selected item opens beside it. Orders show the approval record, the approved version's legs, tax tape, pre-trade reading and repurchase restrictions, with links to the team thread and the workbench — the record, never a re-run. An alert shows itself, its record trail and its account context. Correspondence shows the message as the client saw it and the firm-only provenance. Firm viewers reach it from a "Desk" pane at the top of the thread list and from the command line; Robert is told it does not exist. Mark's thread context links his pending orders to their Supervision item.

**Rulings this task carries:**
- "Workbench-style side by side": the queue takes four columns and the item eight at the `split` breakpoint (1100px); below it the item drops under the queue.
- The workbench link opens the proposal's workbench, which shows its latest version; when the approved version is not the latest, the orders item says `v{latest} is newer and unapproved; these orders are from v{n}.` (A version-pinned read-only workbench is not built in this phase.)
- The Desk pane is part of the thread list column, so the shell's Phase 2 assertions about the thread list's headings and links gain "Desk" and "Supervision" for firm viewers (Robert's are unchanged).

**Files:**
- Create: `src/workspace/supervision/SupervisionPage.tsx`, `SupervisionQueue.tsx`, `ItemDetail.tsx`, `OrdersEvidence.tsx`, `AlertEvidence.tsx`, `CorrespondenceEvidence.tsx`, `supervision-items.ts`
- Modify: `src/app/routes.tsx`, `src/app/use-destinations.ts`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/context/ApprovalPanel.tsx` (Mark's link), `src/workspace/__tests__/shell.test.tsx` (expectations)
- Test: `src/workspace/__tests__/supervision.test.tsx` (new)

**Interfaces:**
- Consumes: `useSupervision` (Task 8); the supervision types (Task 1); `ActRecordSlip` with provenance (Task 10).
- Produces:

```ts
// src/workspace/supervision/supervision-items.ts
export const ITEM_KINDS: readonly SupervisionItemKind[]
export const isItemKind: (value: string) => value is SupervisionItemKind
export const supervisionHref: (kind: SupervisionItemKind, id: string) => string        // '/supervision/orders/prop-0001'
export const ITEM_HEADING: Readonly<Record<SupervisionItemKind, string>>               // Orders / Alert / Correspondence
export type FoundItem = { item: SupervisionItem; open: boolean; recorded: BindingAct[] }
export function findItem(queue: SupervisionQueue, kind: SupervisionItemKind, id: string): FoundItem | undefined
// src/workspace/supervision/ItemDetail.tsx
export function ItemDetail(props: { found: FoundItem; directory: Directory }): JSX.Element   // Task 12 adds the disposition panel
```

Accessible names, exactly: queue `navigation` "Supervision queue"; groups "Orders awaiting release", "Open alerts", "Correspondence to review", "Disposed today"; item region `{Orders|Alert|Correspondence} · {title}` (e.g. "Orders · Johnson rebalance · v1"); legs table "Approved legs · v{n}"; trail list "Record trail" (kit); empty item "Choose an item from the queue."; missing item "This item is not in the queue. It may have been disposed of on another day, withdrawn by the advisor, or never existed."; client page h1 "Supervision not found".

- [ ] **Step 1: Write the failing test, and update the shell's expectations**

In `src/workspace/__tests__/shell.test.tsx`: the Adrian test expects `groupHeadings()` `['Desk', 'Private', 'Internal', 'Client', 'Agents on this desk']` and `threadLinks()` `['Supervision', 'Brief', 'Johnson Rebalance Review', 'Robert Johnson']`; the Mark test expects `['Supervision', 'Johnson Rebalance Review', 'Robert Johnson']` and `['Desk', 'Internal', 'Client', 'Agents on this desk']`; Robert's are unchanged.

Create `src/workspace/__tests__/supervision.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, draftLetter, sendToClient } from '@/services/workspace'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function approved() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  await approveProposal(ADRIAN, detail.id, 1, detail.versions[0]!.fingerprint)
  return detail.versions[0]!.fingerprint
}
async function open(path: string) {
  renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Supervision' })
  return within(screen.getByRole('navigation', { name: 'Supervision queue' }))
}

describe('Supervision', () => {
  it('Mark reads the queue in its groups and opens the orders evidence beside it', async () => {
    const fingerprint = await approved()
    viewAsOnLoad('cco-001')
    const queue = await open('/supervision')
    for (const group of ['Orders awaiting release', 'Open alerts', 'Correspondence to review', 'Disposed today']) {
      expect(queue.getByRole('heading', { name: group })).toBeInTheDocument()
    }
    expect(screen.getByText('Choose an item from the queue.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Threads' })).toBeNull()
    await userEvent.setup().click(queue.getByRole('link', { name: /^Johnson rebalance · v1/ }))
    const item = await screen.findByRole('region', { name: 'Orders · Johnson rebalance · v1' })
    for (const text of [fingerprint, 'Adrian Hale, Advisor', 'REC-0001', 'This is the record of what was approved. The checks are not run again here.', 'PENDING COMPLIANCE REVIEW']) {
      expect(item).toHaveTextContent(text)
    }
    expect(within(item).getByRole('table', { name: 'Approved legs · v1' })).toBeInTheDocument()
    expect(within(item).getByRole('link', { name: /Team thread/ })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(within(item).getByRole('link', { name: /Workbench/ })).toHaveAttribute('href', '/proposals/prop-0001?from=th-johnson-review')
  })

  it('opens the AAPL alert with its record trail and account context', async () => {
    viewAsOnLoad('cco-001')
    await open('/supervision/alert/comp-002')
    const item = await screen.findByRole('region', { name: 'Alert · Single-name concentration — AAPL in Johnson Trust' })
    expect(within(item).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Under Review')
    expect(within(item).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Mark Davis (CCO)')
    expect(within(item).getByRole('list', { name: 'Reviewer notes' })).toHaveTextContent('sr-003')
    expect(item).toHaveTextContent('Johnson Family Trust')
  })

  it("opens a sent letter as Robert saw it, with the firm-only provenance", async () => {
    await approved()
    const draft = await draftLetter(ADRIAN, 'th-robert', 'prop-0001')
    const act = await sendToClient(ADRIAN, draft.id)
    viewAsOnLoad('cco-001')
    await open(`/supervision/correspondence/${act.messageId}`)
    const item = await screen.findByRole('region', { name: 'Correspondence · Message to Robert Johnson' })
    expect(item).toHaveTextContent('Dear Robert,')
    expect(within(item).getByRole('note', { name: "Visibility: Firm only · client can't see" })).toBeInTheDocument()
    expect(item).toHaveTextContent(/from v1 · fingerprint .* · agent draft, unedited/)
  })

  it('an item not in the queue says so', async () => {
    await open('/supervision/orders/prop-9999')
    expect(screen.getByText('This item is not in the queue. It may have been disposed of on another day, withdrawn by the advisor, or never existed.')).toBeInTheDocument()
  })

  it('Robert is told Supervision does not exist, and the thread list never offers it to him', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/supervision/orders/prop-0001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Supervision not found' })).toBeInTheDocument()
  })

  it("Mark's thread context links his pending orders to their Supervision item", async () => {
    await approved()
    viewAsOnLoad('cco-001')
    renderRoutes(routes, '/t/th-johnson-review')
    const panel = await within(await screen.findByRole('complementary', { name: 'Thread context' })).findByRole('region', { name: 'Approval · Johnson rebalance' })
    expect(within(panel).getByRole('link', { name: /Review in Supervision/ })).toHaveAttribute('href', '/supervision/orders/prop-0001')
    expect(within(panel).queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/workspace/__tests__/supervision.test.tsx src/workspace/__tests__/shell.test.tsx --testTimeout 30000`
Expected: FAIL — `/supervision` is not a route; the thread list has no Desk.

- [ ] **Step 3: Route, Desk, command line, Mark's link**

`src/app/routes.tsx`: import `SupervisionPage`; add `const fullWidthHandle: ShellHandle = { threadList: 'hidden' }` and, in the shell's children:

```tsx
          { path: 'supervision', element: <SupervisionPage />, handle: fullWidthHandle },
          { path: 'supervision/:kind/:id', element: <SupervisionPage />, handle: fullWidthHandle },
```

`src/workspace/shell/ThreadList.tsx`: import `useViewer` and `isClientViewer`; render `<DeskLinks />` first inside the column, and add:

```tsx
/** Firm surfaces that are not threads. A client is never offered them. */
const DESK: readonly { to: string; label: string }[] = [{ to: '/supervision', label: 'Supervision' }]

function DeskLinks() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  if (!directory.data || isClientViewer(directory.data, viewerId)) return null
  return (
    <Pane title="Desk">
      <ul className="flex flex-col">
        {DESK.map(({ to, label }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => cn('flex border-l-2 py-2 pl-3 pr-2 text-body hover:bg-face', isActive ? 'border-ink bg-face font-semibold' : 'border-transparent')}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </Pane>
  )
}
```

`src/app/use-destinations.ts`: for firm viewers add `{ id: 'supervision', label: 'Supervision', aliases: ['queue', 'compliance'], run: () => navigate('/supervision') }` before the kit entry.

`src/workspace/context/ApprovalPanel.tsx`: import `Link` and `supervisionHref`; after the staged orders:

```tsx
      {pending.length > 0 && permissions.includes('release_orders') ? (
        <Link to={supervisionHref('orders', detail.id)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
          Review in Supervision <span aria-hidden="true">↗</span>
        </Link>
      ) : null}
```

- [ ] **Step 4: The items helper and the page**

Create `src/workspace/supervision/supervision-items.ts`:

```ts
import type { BindingAct } from '@/types/workspace'
import type { SupervisionItem, SupervisionItemKind, SupervisionQueue } from '@/types/workspace-supervision'

export const ITEM_KINDS: readonly SupervisionItemKind[] = ['orders', 'alert', 'correspondence']
export const isItemKind = (value: string): value is SupervisionItemKind => (ITEM_KINDS as readonly string[]).includes(value)
export const supervisionHref = (kind: SupervisionItemKind, id: string) => `/supervision/${kind}/${encodeURIComponent(id)}`
export const ITEM_HEADING: Readonly<Record<SupervisionItemKind, string>> = { orders: 'Orders', alert: 'Alert', correspondence: 'Correspondence' }

/** The item a route names — open in the queue, or disposed of today — with the acts recorded on it today, newest first. */
export type FoundItem = { item: SupervisionItem; open: boolean; recorded: BindingAct[] }

export function findItem(queue: SupervisionQueue, kind: SupervisionItemKind, id: string): FoundItem | undefined {
  const open = [...queue.orders, ...queue.alerts, ...queue.correspondence].find((i) => i.kind === kind && i.id === id)
  const disposed = queue.disposedToday.filter((d) => d.item.kind === kind && d.item.id === id)
  const item = open ?? disposed[0]?.item
  return item ? { item, open: open !== undefined, recorded: disposed.map((d) => d.act) } : undefined
}
```

Create `src/workspace/supervision/SupervisionPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useDirectory, useSupervision } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { isClientViewer } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory } from '@/types/workspace'
import { ItemDetail } from './ItemDetail'
import { SupervisionQueue } from './SupervisionQueue'
import { findItem, isItemKind } from './supervision-items'

/** Firm-only: a client is told Supervision does not exist, and a switch to a client goes home. */
export function SupervisionPage() {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const directory = useDirectory()
  const viewerIsClient = directory.data !== undefined && isClientViewer(directory.data, viewerId)
  const switchedToClient = viewerIsClient && viewerId !== openedAs
  useEffect(() => {
    if (switchedToClient) navigate('/', { replace: true })
  }, [switchedToClient, navigate])
  if (switchedToClient || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading supervision…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (viewerIsClient) return <SupervisionNotFound />
  return <Supervision directory={directory.data} />
}

function Supervision({ directory }: { directory: Directory }) {
  const { viewerId } = useViewer()
  const { kind, id } = useParams()
  const queue = useSupervision()
  if (queue.isError) return isNotFound(queue.error) ? <SupervisionNotFound /> : <p role="alert" className="text-body">{queue.error.message}</p>
  if (queue.isPending) return <p role="status" className="text-body text-ink-3">Loading supervision…</p>
  const found = kind !== undefined && id !== undefined && isItemKind(kind) ? findItem(queue.data, kind, id) : undefined
  const disposes = (directory.permissions[viewerId] ?? []).includes('release_orders')
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Supervision</h1>
        <p className="text-body text-ink-2">
          {disposes
            ? 'Staged orders wait here: nothing executes until compliance releases it. Each disposition is a binding act with your rationale.'
            : 'You can read the queue; only compliance records a disposition.'}
        </p>
      </header>
      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        <div className="col-span-12 min-w-0 split:col-span-4">
          <SupervisionQueue queue={queue.data} directory={directory} />
        </div>
        <div className="col-span-12 min-w-0 split:col-span-8">
          {found ? <ItemDetail key={`${found.item.kind}:${found.item.id}`} found={found} directory={directory} />
            : kind !== undefined ? <p className="text-body text-ink-2">This item is not in the queue. It may have been disposed of on another day, withdrawn by the advisor, or never existed.</p>
            : <p className="text-body text-ink-3">Choose an item from the queue.</p>}
        </div>
      </div>
    </div>
  )
}

function SupervisionNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Supervision not found</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
```

Create `src/workspace/supervision/SupervisionQueue.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { ACT_KIND_LABEL } from '@/workspace/thread/act-kind-label'
import type { Directory } from '@/types/workspace'
import type { SupervisionItem, SupervisionQueue as Queue } from '@/types/workspace-supervision'
import { supervisionHref } from './supervision-items'

type Row = { key: string; href: string; label: string; meta: string; tags: string[] }

function rowOf(item: SupervisionItem, directory: Directory): Row {
  const href = supervisionHref(item.kind, item.id)
  switch (item.kind) {
    case 'orders': {
      const pending = item.staged.filter((o) => o.status === 'pending_compliance').length
      const approver = personIn(directory, item.approval.approverId).name
      return { key: `orders:${item.id}`, href, label: item.title, meta: `approved by ${approver} · ${pending} ${pending === 1 ? 'order' : 'orders'}`, tags: item.escalation ? ['ESCALATED'] : [] }
    }
    case 'alert':
      return { key: `alert:${item.id}`, href, label: item.title, meta: `${item.id} · raised ${fmtTimestamp(item.alert.createdAt)}`, tags: [item.alert.severity] }
    case 'correspondence':
      return { key: `correspondence:${item.id}`, href, label: item.title, meta: `sent ${fmtTimestamp(item.message.at)}`, tags: item.flagged ? ['FLAGGED'] : [] }
  }
}

export function SupervisionQueue({ queue, directory }: { queue: Queue; directory: Directory }) {
  const groups: { title: string; empty: string; rows: Row[] }[] = [
    { title: 'Orders awaiting release', empty: 'No orders are waiting.', rows: queue.orders.map((i) => rowOf(i, directory)) },
    { title: 'Open alerts', empty: 'No open alerts.', rows: queue.alerts.map((i) => rowOf(i, directory)) },
    { title: 'Correspondence to review', empty: 'Nothing sent is waiting for review.', rows: queue.correspondence.map((i) => rowOf(i, directory)) },
    {
      title: 'Disposed today', empty: 'Nothing disposed of yet today.',
      rows: queue.disposedToday.map(({ item, act }) => ({
        key: act.id, href: supervisionHref(item.kind, item.id), label: `${ACT_KIND_LABEL[act.kind]} · ${item.title}`,
        meta: `${personIn(directory, act.actorId).name} · ${fmtTimestamp(act.at)} · ${act.id}`, tags: [],
      })),
    },
  ]
  return (
    <nav aria-label="Supervision queue" className="flex flex-col gap-8">
      {groups.map((g) => (
        <Pane key={g.title} title={g.title} meta={String(g.rows.length)}>
          {g.rows.length === 0 ? <p className="text-body text-ink-3">{g.empty}</p> : (
            <ul className="flex flex-col">
              {g.rows.map((r) => (
                <li key={r.key}>
                  <NavLink to={r.href} className={({ isActive }) => cn('flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2 hover:bg-face', isActive ? 'border-ink bg-face' : 'border-transparent')}>
                    <span className="text-body">{r.label}</span>
                    <span className="flex flex-wrap items-baseline gap-2 text-label text-ink-3">
                      {r.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                      <span className="tabular">{r.meta}</span>
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </Pane>
      ))}
    </nav>
  )
}
```

Create `src/workspace/supervision/ItemDetail.tsx`:

```tsx
import { useId } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { actAnchorId } from '@/workspace/context/act-anchor'
import { ActRecordSlip } from '@/workspace/thread/ActRecordSlip'
import type { Directory } from '@/types/workspace'
import { AlertEvidence } from './AlertEvidence'
import { CorrespondenceEvidence } from './CorrespondenceEvidence'
import { OrdersEvidence } from './OrdersEvidence'
import { ITEM_HEADING, type FoundItem } from './supervision-items'

/** One item beside the queue: its evidence, and the records compliance made on it today. */
export function ItemDetail({ found, directory }: { found: FoundItem; directory: Directory }) {
  const titleId = useId()
  const { item, recorded } = found
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      <h2 id={titleId} className="text-copy font-semibold">{`${ITEM_HEADING[item.kind]} · ${item.title}`}</h2>
      {item.kind === 'orders' ? <OrdersEvidence item={item} directory={directory} />
        : item.kind === 'alert' ? <AlertEvidence item={item} />
        : <CorrespondenceEvidence item={item} directory={directory} />}
      {recorded.length > 0 ? (
        <Pane title="Recorded today">
          <ul className="flex flex-col gap-3">
            {recorded.map((act) => (
              <li key={act.id} id={actAnchorId(act.id)} tabIndex={-1}><ActRecordSlip act={act} directory={directory} /></li>
            ))}
          </ul>
        </Pane>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 5: The evidence**

Create `src/workspace/supervision/OrdersEvidence.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { fmtMoney, fmtPrice, fmtQuantity, fmtTimestamp } from '@/kit/measure'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import { PretradeNotes } from '@/workspace/proposal/PretradeNotes'
import { ProposalLegsTable } from '@/workspace/proposal/ProposalLegsTable'
import { RestrictionList } from '@/workspace/proposal/RestrictionList'
import { FILL_SIDE_WORDS, SIDE_WORDS } from '@/workspace/proposal/leg-status'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { taxScope } from '@/workspace/proposal/tax-scope'
import type { Directory } from '@/types/workspace'
import type { OrdersItem } from '@/types/workspace-supervision'

const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'
const TERM = 'text-label uppercase text-ink-3'

/** The record of what was approved, as compliance reviews it. Nothing here re-runs a check. */
export function OrdersEvidence({ item, directory }: { item: OrdersItem; directory: Directory }) {
  const approver = personIn(directory, item.approval.approverId)
  const v = item.version
  const s = v.summary
  // As the workbench's tape: the return's year to date, short plus long (collectibles are part of long).
  const ytd = v.preview.ytdRealisedOnReturn
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="Approval record">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
          <dt className={TERM}>Version</dt><dd className="tabular">{`v${v.n}`}</dd>
          <dt className={TERM}>Fingerprint</dt><dd className="tabular">{item.approval.fingerprint}</dd>
          <dt className={TERM}>Approved by</dt><dd>{`${approver.name}, ${ROLE_LABEL[approver.role]}`}</dd>
          <dt className={TERM}>At</dt><dd className="tabular">{fmtTimestamp(item.approval.at)}</dd>
          <dt className={TERM}>Record</dt><dd className="tabular">{item.approval.actId}</dd>
        </dl>
        {item.latestVersion > v.n ? <p className="text-body text-ink-2">{`v${item.latestVersion} is newer and unapproved; these orders are from v${v.n}.`}</p> : null}
        <p className="text-body text-ink-2">This is the record of what was approved. The checks are not run again here.</p>
      </Pane>
      <OrdersStatus item={item} />
      <Pane title="Approved legs"><ProposalLegsTable version={v} caption={`Approved legs · v${v.n}`} /></Pane>
      <Pane title="Tax effect" meta="return-level estimate against this year's results">
        <TaxTape gains={s.gains} losses={s.losses} netShortTerm={s.netShortTerm} netLongTerm={s.netLongTerm}
          grossTax={s.grossTax} netTax={s.netTax} scope={taxScope(v.preview)} rateBasis={RATE_DISCLOSURE}
          yearToDate={ytd ? ytd.shortTerm + ytd.longTerm : undefined} />
      </Pane>
      <Pane title="Pre-trade reading"><PretradeNotes pretrade={v.pretrade} /></Pane>
      <RestrictionList restrictions={v.preview.repurchaseRestrictions} />
      <div className="flex flex-wrap gap-4">
        <Link to={`/t/${encodeURIComponent(item.threadId)}`} className={LINK}>Team thread <span aria-hidden="true">↗</span></Link>
        <Link to={proposalWorkbenchHref(item.proposalId, item.threadId)} className={LINK}>Workbench <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  )
}

function OrdersStatus({ item }: { item: OrdersItem }) {
  if (item.approval.status === 'released') {
    return (
      <Pane title="Filled">
        <p className="flex flex-wrap items-baseline gap-2 text-body"><Tag tone="solid">FILLED</Tag><span className="text-ink-2">Released and filled at the day&apos;s prices.</span></p>
        <ul aria-label="Fills" className="flex flex-col gap-1 text-body">
          {item.fills.map((f) => (
            <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span>{`${FILL_SIDE_WORDS[f.side]} ${fmtQuantity(f.quantity)} ${f.symbol} at ${fmtPrice(f.price)}`}</span>
              <span className="tabular text-ink-2">{`${fmtMoney(f.value)} ${f.currency} · ${fmtTimestamp(f.at)}`}</span>
            </li>
          ))}
        </ul>
      </Pane>
    )
  }
  if (item.approval.status === 'returned') {
    return <p className="flex flex-wrap items-baseline gap-2 text-body"><Tag>RETURNED</Tag><span className="text-ink-2">Returned to the advisor; the approval is withdrawn.</span></p>
  }
  const pending = item.staged.filter((o) => o.status === 'pending_compliance')
  return (
    <Pane title="Staged orders">
      <p className="flex flex-wrap items-baseline gap-2 text-body">
        <Tag tone="hatch">PENDING COMPLIANCE REVIEW</Tag>
        {item.escalation ? <Tag tone="solid">ESCALATED</Tag> : null}
      </p>
      <ul aria-label="Staged orders" className="flex flex-col gap-1 text-body">
        {pending.map((o) => (
          <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>{`${SIDE_WORDS[o.side]} ${fmtQuantity(o.quantity)} ${o.symbol}`}</span>
            <span className="tabular text-ink-2">{fmtMoney(o.estimatedValue)} <span className="text-ink-3">{o.currency}</span></span>
          </li>
        ))}
      </ul>
    </Pane>
  )
}
```

Create `src/workspace/supervision/AlertEvidence.tsx`:

```tsx
import { Pane } from '@/kit/layout/Pane'
import { RecordTrail } from '@/kit/record-trail/RecordTrail'
import { Tag } from '@/kit/tag/Tag'
import { fmtTimestamp } from '@/kit/measure'
import type { AlertOutcome } from '@/types/workspace'
import type { AlertItem } from '@/types/workspace-supervision'

const DISPOSITION_WORDS: Readonly<Record<AlertOutcome, string>> = {
  approve: 'Approved by compliance; closed.',
  reject: 'Rejected by compliance; closed.',
  request_changes: 'Returned to the advisor for changes.',
}
const TERM = 'text-label uppercase text-ink-3'

export function AlertEvidence({ item }: { item: AlertItem }) {
  const { alert, trail, context } = item
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="Alert">
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone={alert.severity === 'critical' ? 'solid' : 'outline'}>{alert.severity}</Tag>
          <span>{alert.type}</span>
        </p>
        <p className="text-copy">{alert.description}</p>
        <p className="tabular text-label text-ink-3">{`${alert.id} · raised ${fmtTimestamp(alert.createdAt)}`}</p>
        {item.disposition ? <p className="text-body text-ink-2">{DISPOSITION_WORDS[item.disposition]}</p> : null}
      </Pane>
      <Pane title="Record trail">
        <RecordTrail steps={trail.map((r) => ({ label: r.action, actor: r.reviewer, state: 'DONE' as const, at: r.timestamp }))} />
        <ul aria-label="Reviewer notes" className="flex flex-col gap-1 text-body">
          {trail.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3">
              <span className="tabular text-label text-ink-3">{r.id}</span>
              <span>{r.notes}</span>
            </li>
          ))}
        </ul>
      </Pane>
      <Pane title="Account context">
        {context.accountName || context.clientName ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
            {context.clientName ? <><dt className={TERM}>Client</dt><dd>{context.clientName}</dd></> : null}
            {context.accountName ? <><dt className={TERM}>Account</dt><dd>{context.accountName}</dd></> : null}
          </dl>
        ) : <p className="text-body text-ink-3">The alert names no account or client.</p>}
      </Pane>
    </div>
  )
}
```

Create `src/workspace/supervision/CorrespondenceEvidence.tsx`:

```tsx
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { fmtTimestamp } from '@/kit/measure'
import { sentLetterOrigin } from '@/workspace/context/draft-origin'
import { personIn } from '@/workspace/people/directory-people'
import type { Directory } from '@/types/workspace'
import type { CorrespondenceItem } from '@/types/workspace-supervision'

/** The message exactly as the client received it, and — firm-only — where it came from. */
export function CorrespondenceEvidence({ item, directory }: { item: CorrespondenceItem; directory: Directory }) {
  const sender = personIn(directory, item.message.authorId)
  const origin = sentLetterOrigin(item.sendAct, directory) ?? `Written by ${sender.name}; no agent draft.`
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="As the client saw it">
        <VisibilityBand visibility="client" scale="message" audience={item.clientName} />
        <p className="tabular text-label text-ink-3">{`Sent by ${sender.name} · ${fmtTimestamp(item.message.at)}`}</p>
        <p className="whitespace-pre-line text-copy">{item.message.body}</p>
      </Pane>
      <Pane title="Provenance">
        <VisibilityBand visibility="internal" scale="message" />
        <p className="text-body">{origin}</p>
        <p className="tabular text-label text-ink-3">{`Record ${item.sendAct.id} · fingerprint ${item.sendAct.fingerprint}`}</p>
      </Pane>
      {item.flagged ? (
        <p className="flex flex-wrap items-baseline gap-2 text-body">
          <Tag tone="solid">FLAGGED</Tag>
          <span className="text-ink-2">Flagged for follow-up; it stays in the queue until it is reviewed.</span>
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/supervision.test.tsx src/workspace/__tests__/shell.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx src/app/__tests__/routes.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 7: Commit**

```bash
git add src/app src/workspace
git commit -m "feat(supervision): the queue beside the item — orders, alert and correspondence evidence; Desk entry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The disposition panel

Beside each open item, compliance chooses the disposition for its kind, writes the required rationale (kit `TextInput`), confirms in a dialog that states the consequence and quotes the rationale, and the new record slip takes focus. Other firm viewers read "Only compliance records a disposition." A refusal (the approval moved, the evidence changed) is shown by the page in the engine's words, even when the item has left the queue.

**Files:**
- Create: `src/workspace/supervision/DispositionPanel.tsx`, `src/workspace/supervision/disposition-options.ts`
- Modify: `src/workspace/supervision/ItemDetail.tsx`, `src/workspace/supervision/SupervisionPage.tsx`
- Test: `src/workspace/__tests__/disposition.test.tsx` (new)

**Interfaces:**
- Consumes: `useRecordComplianceAct` (Task 8); `FoundItem`, `ItemDetail` (Task 11); `useFocusAfter` from `@/kit/keyboard/use-focus-after`; `actAnchorId`.
- Produces:

```ts
// src/workspace/supervision/disposition-options.ts
export type DispositionOption = { value: string; act: ComplianceActKind; label: string; consequence: string; request: (rationale: string) => ComplianceActRequest }
export function dispositionOptions(item: SupervisionItem, open: boolean): DispositionOption[]   // none for an item no longer open
// ItemDetail gains: onRefused: (message: string) => void
```

Exact strings — options and consequences:

| Item | Label | Consequence (dialog description) |
|---|---|---|
| orders | `Release orders` | `The staged orders are released and fill at the day's prices. The book moves.` |
| orders | `Return to advisor` | `The approval is withdrawn and the staged orders are returned to the advisor.` |
| orders (not yet escalated) | `Escalate` | `The orders stay held, and the item is marked escalated.` |
| alert | `Approve` | `The alert is closed as approved, and the disposition joins its record trail.` |
| alert | `Reject` | `The alert is closed as rejected, and the disposition joins its record trail.` |
| alert | `Request changes` | `The alert goes back to the advisor for changes, and the request joins its record trail.` |
| correspondence | `Mark reviewed` | `The message is marked reviewed and leaves the queue.` |
| correspondence (not yet flagged) | `Flag for follow-up` | `The message is flagged for follow-up and stays in the queue.` |

Panel: region "Record a disposition"; select "Disposition"; input "Rationale (required)"; button "Record disposition", disabled while the rationale is blank with the description "Write a rationale to record the disposition."; note "Recorded as a binding act in your name, with this rationale."; dialog title `{label}?`; Cancel / Confirm.

- [ ] **Step 1: Write the failing test**

Create `src/workspace/__tests__/disposition.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, draftLetter, sendToClient, withdrawApproval } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const queue = () => within(screen.getByRole('navigation', { name: 'Supervision queue' }))

async function approved() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  await approveProposal(ADRIAN, detail.id, 1, detail.versions[0]!.fingerprint)
}
async function openItem(path: string, name: string) {
  renderRoutes(routes, path)
  const item = await screen.findByRole('region', { name })
  return { item, panel: within(item).getByRole('region', { name: 'Record a disposition' }) }
}

describe('recording a disposition', () => {
  it('Mark releases with a rationale, once, after confirming; focus goes to the new slip; the item moves to Disposed today', async () => {
    await approved()
    viewAsOnLoad('cco-001')
    const { item, panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    const record = within(panel).getByRole('button', { name: 'Record disposition' })
    expect(record).toBeDisabled()
    expect(record).toHaveAccessibleDescription('Write a rationale to record the disposition.')
    const user = userEvent.setup()
    const rationale = within(panel).getByLabelText('Rationale (required)')
    await user.type(rationale, '   ')
    expect(record).toBeDisabled()
    await user.clear(rationale)
    await user.type(rationale, 'Legs, tax effect and pre-trade reading reviewed.')
    await user.click(record)
    const dialog = screen.getByRole('dialog', { name: 'Release orders?' })
    expect(dialog).toHaveTextContent("The staged orders are released and fill at the day's prices. The book moves.")
    expect(dialog).toHaveTextContent('Legs, tax effect and pre-trade reading reviewed.')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    const slip = await within(item).findByRole('article', { name: 'Released the orders staged from v1 of the Johnson rebalance' })
    expect(slip).toHaveTextContent('Rationale · Legs, tax effect and pre-trade reading reviewed.')
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0002')))
    expect(store().acts.filter((a) => a.kind === 'release_orders')).toHaveLength(1)
    expect(queue().getByText('No orders are waiting.')).toBeInTheDocument()
    expect(queue().getByRole('link', { name: /^Release orders · Johnson rebalance · v1/ })).toBeInTheDocument()
    expect(item).toHaveTextContent('FILLED')
    expect(within(item).queryByRole('region', { name: 'Record a disposition' })).toBeNull()
  })

  it('the advisor reads the item but records nothing', async () => {
    await approved()
    const { panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    expect(panel).toHaveTextContent('Only compliance records a disposition.')
    expect(within(panel).queryByRole('button')).toBeNull()
  })

  it('a release against an approval withdrawn meanwhile shows the engine\'s reason and records nothing', async () => {
    await approved()
    viewAsOnLoad('cco-001')
    const { panel } = await openItem('/supervision/orders/prop-0001', 'Orders · Johnson rebalance · v1')
    const user = userEvent.setup()
    await user.type(within(panel).getByLabelText('Rationale (required)'), 'Reviewed.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await withdrawApproval(ADRIAN, 'prop-0001')
    await user.click(within(screen.getByRole('dialog', { name: 'Release orders?' })).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The approval of v1 (REC-0001) was withdrawn by the advisor; nothing from it can be released.')
    expect(await screen.findByText('This item is not in the queue. It may have been disposed of on another day, withdrawn by the advisor, or never existed.')).toBeInTheDocument()
    expect(store().acts.some((a) => a.kind === 'release_orders')).toBe(false)
  })

  it('Mark approves the AAPL alert; the disposition joins its record trail', async () => {
    viewAsOnLoad('cco-001')
    const name = 'Alert · Single-name concentration — AAPL in Johnson Trust'
    const { item, panel } = await openItem('/supervision/alert/comp-002', name)
    const user = userEvent.setup()
    await user.type(within(panel).getByLabelText('Rationale (required)'), 'Long-held position; the IPS exception is documented.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Approve?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(item).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Approved'))
    expect(within(item).getByRole('list', { name: 'Reviewer notes' })).toHaveTextContent('sr-004')
    expect(queue().getByRole('link', { name: /^Dispose alert · Single-name concentration — AAPL in Johnson Trust/ })).toBeInTheDocument()
  })

  it('a flagged letter stays in the queue, flagged, with only "Mark reviewed" left to choose', async () => {
    await approved()
    const draft = await draftLetter(ADRIAN, 'th-robert', 'prop-0001')
    const sent = await sendToClient(ADRIAN, draft.id)
    viewAsOnLoad('cco-001')
    const { item, panel } = await openItem(`/supervision/correspondence/${sent.messageId}`, 'Correspondence · Message to Robert Johnson')
    const user = userEvent.setup()
    await user.selectOptions(within(panel).getByLabelText('Disposition'), 'Flag for follow-up')
    await user.type(within(panel).getByLabelText('Rationale (required)'), 'Ask Adrian to confirm the look-back date.')
    await user.click(within(panel).getByRole('button', { name: 'Record disposition' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Flag for follow-up?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(item).toHaveTextContent('FLAGGED'))
    expect(queue().getByRole('link', { name: /^Message to Robert Johnson/ })).toBeInTheDocument()
    const options = within(within(item).getByRole('region', { name: 'Record a disposition' })).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Mark reviewed'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/workspace/__tests__/disposition.test.tsx --testTimeout 30000`
Expected: FAIL — no "Record a disposition" region.

- [ ] **Step 3: Options**

Create `src/workspace/supervision/disposition-options.ts`:

```ts
import type { ComplianceActKind } from '@/types/workspace'
import type { ComplianceActRequest, SupervisionItem } from '@/types/workspace-supervision'

/** One disposition compliance may record on an item, with the request it sends. */
export type DispositionOption = { value: string; act: ComplianceActKind; label: string; consequence: string; request: (rationale: string) => ComplianceActRequest }

/** The dispositions an open item admits; an item no longer open admits none. */
export function dispositionOptions(item: SupervisionItem, open: boolean): DispositionOption[] {
  if (!open) return []
  switch (item.kind) {
    case 'orders': {
      const orders = (kind: 'release_orders' | 'return_to_advisor' | 'escalate') => (rationale: string): ComplianceActRequest =>
        ({ kind, proposalId: item.proposalId, approvalActId: item.approval.actId, fingerprint: item.fingerprint, rationale })
      return [
        { value: 'release_orders', act: 'release_orders', label: 'Release orders', consequence: "The staged orders are released and fill at the day's prices. The book moves.", request: orders('release_orders') },
        { value: 'return_to_advisor', act: 'return_to_advisor', label: 'Return to advisor', consequence: 'The approval is withdrawn and the staged orders are returned to the advisor.', request: orders('return_to_advisor') },
        ...(item.escalation ? [] : [{ value: 'escalate', act: 'escalate' as const, label: 'Escalate', consequence: 'The orders stay held, and the item is marked escalated.', request: orders('escalate') }]),
      ]
    }
    case 'alert': {
      const alert = (outcome: 'approve' | 'reject' | 'request_changes') => (rationale: string): ComplianceActRequest =>
        ({ kind: 'dispose_alert', alertId: item.id, outcome, fingerprint: item.fingerprint, rationale })
      return [
        { value: 'approve', act: 'dispose_alert', label: 'Approve', consequence: 'The alert is closed as approved, and the disposition joins its record trail.', request: alert('approve') },
        { value: 'reject', act: 'dispose_alert', label: 'Reject', consequence: 'The alert is closed as rejected, and the disposition joins its record trail.', request: alert('reject') },
        { value: 'request_changes', act: 'dispose_alert', label: 'Request changes', consequence: 'The alert goes back to the advisor for changes, and the request joins its record trail.', request: alert('request_changes') },
      ]
    }
    case 'correspondence': {
      const review = (outcome: 'reviewed' | 'flagged') => (rationale: string): ComplianceActRequest =>
        ({ kind: 'review_correspondence', messageId: item.id, outcome, fingerprint: item.fingerprint, rationale })
      return [
        { value: 'reviewed', act: 'review_correspondence', label: 'Mark reviewed', consequence: 'The message is marked reviewed and leaves the queue.', request: review('reviewed') },
        ...(item.flagged ? [] : [{ value: 'flagged', act: 'review_correspondence' as const, label: 'Flag for follow-up', consequence: 'The message is flagged for follow-up and stays in the queue.', request: review('flagged') }]),
      ]
    }
  }
}
```

- [ ] **Step 4: The panel**

Create `src/workspace/supervision/DispositionPanel.tsx`:

```tsx
import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { Select } from '@/kit/select/Select'
import { TextInput } from '@/kit/text-input/TextInput'
import { useRecordComplianceAct } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory } from '@/types/workspace'
import type { SupervisionItem } from '@/types/workspace-supervision'
import { dispositionOptions } from './disposition-options'

type DispositionPanelProps = {
  item: SupervisionItem
  open: boolean
  directory: Directory
  onRecorded: (actId: string) => void
  /** A refusal outlives this panel: the item may leave the queue when the page refreshes. */
  onRefused: (message: string) => void
}

export function DispositionPanel({ item, open, directory, onRecorded, onRefused }: DispositionPanelProps) {
  const { viewerId } = useViewer()
  const record = useRecordComplianceAct()
  const options = dispositionOptions(item, open)
  const [choice, setChoice] = useState(options[0]?.value ?? '')
  const [rationale, setRationale] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [slipTakesFocus, setSlipTakesFocus] = useState(false)
  // A ref, not render state, so a second click in the same frame cannot record a second act.
  const busy = useRef(false)
  const titleId = useId()
  const reasonId = useId()
  const option = options.find((o) => o.value === choice) ?? options[0]
  if (!option) return null
  const heading = <h3 id={titleId} className="text-label uppercase text-ink">Record a disposition</h3>
  if (!(directory.permissions[viewerId] ?? []).includes(option.act)) {
    return (
      <section aria-labelledby={titleId} className="flex flex-col gap-2 border border-rule-2 p-4">
        {heading}
        <p className="text-body text-ink-2">Only compliance records a disposition.</p>
      </section>
    )
  }
  const blank = rationale.trim().length === 0
  const close = () => { if (!record.isPending) setConfirming(false) }
  const confirm = () => {
    if (busy.current) return
    busy.current = true
    record.mutate(option.request(rationale), {
      onSuccess: (act) => { setSlipTakesFocus(true); setConfirming(false); setRationale(''); onRecorded(act.id) },
      onError: (error) => { setConfirming(false); onRefused(error.message) },
      onSettled: () => { busy.current = false },
    })
  }
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 border border-ink p-4">
      {heading}
      <Select label="Disposition" layout="stacked" value={option.value} options={options.map(({ value, label }) => ({ value, label }))} onChange={setChoice} />
      <TextInput label="Rationale (required)" value={rationale} rows={4} onChange={setRationale} describedBy={blank ? reasonId : undefined} />
      <div className="flex flex-col items-start gap-2">
        <Button disabled={blank || record.isPending} aria-describedby={blank ? reasonId : undefined}
          onClick={() => { record.reset(); setSlipTakesFocus(false); setConfirming(true) }}>
          Record disposition
        </Button>
        {blank ? <p id={reasonId} className="text-body text-ink-2">Write a rationale to record the disposition.</p> : null}
        <p className="text-label text-ink-3">Recorded as a binding act in your name, with this rationale.</p>
      </div>
      <Dialog open={confirming} onOpenChange={(next) => { if (!next) close() }} returnFocus={!slipTakesFocus} title={`${option.label}?`} description={option.consequence}>
        <div className="flex flex-col gap-4">
          <blockquote className="whitespace-pre-line border-l-2 border-rule-2 pl-4 text-copy">{rationale.trim()}</blockquote>
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={record.isPending} onClick={close}>Cancel</Button>
            <Button disabled={record.isPending} onClick={confirm}>Confirm</Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
```

- [ ] **Step 5: Wire it into the item and the page**

Replace `src/workspace/supervision/ItemDetail.tsx` with (the panel sits between the evidence and "Recorded today"; focus moves to the new slip once the refreshed queue shows it):

```tsx
import { useEffect, useId, useState } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { actAnchorId } from '@/workspace/context/act-anchor'
import { ActRecordSlip } from '@/workspace/thread/ActRecordSlip'
import type { Directory } from '@/types/workspace'
import { AlertEvidence } from './AlertEvidence'
import { CorrespondenceEvidence } from './CorrespondenceEvidence'
import { DispositionPanel } from './DispositionPanel'
import { OrdersEvidence } from './OrdersEvidence'
import { ITEM_HEADING, type FoundItem } from './supervision-items'

type ItemDetailProps = { found: FoundItem; directory: Directory; onRefused: (message: string) => void }

/** One item beside the queue: its evidence, the disposition compliance may record, and what it recorded today. */
export function ItemDetail({ found, directory, onRefused }: ItemDetailProps) {
  const titleId = useId()
  const focusAfter = useFocusAfter()
  const [recordedId, setRecordedId] = useState<string>()
  const { item, recorded, open } = found
  const slipShown = recordedId !== undefined && recorded.some((a) => a.id === recordedId)
  useEffect(() => {
    if (recordedId && slipShown) focusAfter(actAnchorId(recordedId))
  }, [recordedId, slipShown, focusAfter])
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      <h2 id={titleId} className="text-copy font-semibold">{`${ITEM_HEADING[item.kind]} · ${item.title}`}</h2>
      {item.kind === 'orders' ? <OrdersEvidence item={item} directory={directory} />
        : item.kind === 'alert' ? <AlertEvidence item={item} />
        : <CorrespondenceEvidence item={item} directory={directory} />}
      <DispositionPanel item={item} open={open} directory={directory} onRecorded={setRecordedId} onRefused={onRefused} />
      {recorded.length > 0 ? (
        <Pane title="Recorded today">
          <ul className="flex flex-col gap-3">
            {recorded.map((act) => (
              <li key={act.id} id={actAnchorId(act.id)} tabIndex={-1}><ActRecordSlip act={act} directory={directory} /></li>
            ))}
          </ul>
        </Pane>
      ) : null}
    </section>
  )
}
```

`src/workspace/supervision/SupervisionPage.tsx` `Supervision`: at the top, before any early return, `const [refusal, setRefusal] = useState<{ path: string; message: string }>()` and `const path = `${kind ?? ''}/${id ?? ''}``; above the grid render `{refusal?.path === path ? <p role="alert" className="text-body">{refusal.message}</p> : null}`; pass `onRefused={(message) => setRefusal({ path, message })}` to `ItemDetail`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/disposition.test.tsx src/workspace/__tests__/supervision.test.tsx --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 7: Commit**

```bash
git add src/workspace/supervision src/workspace/__tests__/disposition.test.tsx
git commit -m "feat(supervision): record a disposition — required rationale, confirm, focus to the new slip

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The Archive

`/archive`, firm only: every recorded act and every message sent to a client, in order, with record id, kind, summary, who recorded it (and the shortcut, when used), fingerprint and a link to its thread — an alert disposition links to its Supervision item. Filters by client, kind and date live in the URL (`?clientId=&kind=&from=&to=`) and go to the engine as they are.

**Files:**
- Create: `src/workspace/archive/ArchivePage.tsx`, `src/workspace/archive/ArchiveTable.tsx`, `src/workspace/archive/archive-filters.ts`
- Modify: `src/app/routes.tsx`, `src/app/use-destinations.ts`, `src/workspace/shell/ThreadList.tsx` (`DESK`), `src/workspace/__tests__/shell.test.tsx` (expectations)
- Test: `src/workspace/__tests__/archive.test.tsx` (new)

**Interfaces:**
- Consumes: `useArchive` (Task 8); `ArchiveEntry`, `ArchiveFilters`, `ArchiveKind` (Task 1); `supervisionHref` (Task 11); `ACT_KIND_LABEL`.
- Produces:

```ts
// src/workspace/archive/archive-filters.ts
export const ARCHIVE_KIND_LABEL: Readonly<Record<ArchiveKind, string>>     // ACT_KIND_LABEL + sent_message: 'Sent message'
export const KIND_OPTIONS: readonly SelectOption[]                          // 'All kinds' first
export function filtersFrom(params: URLSearchParams): ArchiveFilters        // unreadable values dropped
export function withFilter(params: URLSearchParams, key: keyof ArchiveFilters, value: string): URLSearchParams
```

Names: h1 "Archive"; filters group "Archive filters" with selects "Client" (All clients), "Kind" (All kinds), "From" and "To" (Any date); table "Archive" with columns At, Record, Kind, Summary, Recorded by, Fingerprint, Thread; a shortcut act's "Recorded by" reads `Mark Davis · via the presenter shortcut`; client page h1 "Archive not found".

- [ ] **Step 1: Write the failing test, and update the shell's expectations**

In `src/workspace/__tests__/shell.test.tsx`, Adrian's `threadLinks()` become `['Supervision', 'Archive', 'Brief', 'Johnson Rebalance Review', 'Robert Johnson']` and Mark's `['Supervision', 'Archive', 'Johnson Rebalance Review', 'Robert Johnson']`.

Create `src/workspace/__tests__/archive.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { actAsCco, approveProposal, createProposal, draftLetter, recordComplianceAct, sendToClient } from '@/services/workspace'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const kindCell = (row: HTMLElement) => row.querySelectorAll('td')[2]?.textContent

async function session() {
  const detail = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  const fingerprint = detail.versions[0]!.fingerprint
  const approval = await approveProposal(ADRIAN, detail.id, 1, fingerprint)
  const draft = await draftLetter(ADRIAN, 'th-robert', detail.id)
  await sendToClient(ADRIAN, draft.id)
  await recordComplianceAct('cco-001', { kind: 'release_orders', proposalId: detail.id, approvalActId: approval.id, fingerprint, rationale: 'Reviewed.' })
}
async function archiveRows() {
  const table = await screen.findByRole('table', { name: 'Archive' })
  return within(table).getAllByRole('row').slice(1)
}

describe('the Archive', () => {
  it('lists every record in order with its kind, actor, fingerprint and thread, and filters by kind through the URL', async () => {
    await session()
    const { router } = renderRoutes(routes, '/archive')
    await screen.findByRole('heading', { level: 1, name: 'Archive' })
    const rows = await archiveRows()
    expect(rows.map(kindCell)).toEqual(['Approve proposal', 'Send to client', 'Sent message', 'Release orders'])
    expect(rows[3]).toHaveTextContent('Mark Davis')
    expect(rows[3]).toHaveTextContent('Released the orders staged from v1 of the Johnson rebalance')
    expect(within(rows[3]!).getByRole('link', { name: 'Johnson Rebalance Review' })).toHaveAttribute('href', '/t/th-johnson-review')
    expect(within(rows[2]!).getByRole('link', { name: 'Robert Johnson' })).toHaveAttribute('href', '/t/th-robert')
    await userEvent.setup().selectOptions(screen.getByLabelText('Kind'), 'Release orders')
    await waitFor(async () => expect((await archiveRows()).map(kindCell)).toEqual(['Release orders']))
    expect(router.state.location.search).toBe('?kind=release_orders')
  })

  it('reads its filters from the URL', async () => {
    await session()
    renderRoutes(routes, '/archive?kind=send_to_client&clientId=cli-001&from=2026-02-25')
    await waitFor(async () => expect((await archiveRows()).map(kindCell)).toEqual(['Send to client']))
    expect(screen.getByLabelText('Client')).toHaveValue('cli-001')
  })

  it('names the presenter shortcut, and links an alert disposition to its Supervision item', async () => {
    await actAsCco(ADRIAN, { kind: 'alert', id: 'comp-002' })
    renderRoutes(routes, '/archive')
    const [row] = await archiveRows()
    expect(row).toHaveTextContent('Mark Davis · via the presenter shortcut')
    expect(within(row!).getByRole('link', { name: 'Supervision' })).toHaveAttribute('href', '/supervision/alert/comp-002')
  })

  it('Robert is told the archive does not exist', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/archive')
    expect(await screen.findByRole('heading', { level: 1, name: 'Archive not found' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/workspace/__tests__/archive.test.tsx src/workspace/__tests__/shell.test.tsx --testTimeout 30000`
Expected: FAIL — `/archive` is not a route.

- [ ] **Step 3: Filters**

Create `src/workspace/archive/archive-filters.ts`:

```ts
import type { SelectOption } from '@/kit/select/Select'
import type { ArchiveFilters, ArchiveKind } from '@/types/workspace-supervision'
import { ACT_KIND_LABEL } from '@/workspace/thread/act-kind-label'

export const ARCHIVE_KIND_LABEL: Readonly<Record<ArchiveKind, string>> = { ...ACT_KIND_LABEL, sent_message: 'Sent message' }

const KINDS: readonly ArchiveKind[] = [
  'approve_proposal', 'withdraw_approval', 'send_to_client', 'sent_message', 'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence',
]
const isArchiveKind = (value: string): value is ArchiveKind => (KINDS as readonly string[]).includes(value)
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export const KIND_OPTIONS: readonly SelectOption[] = [{ value: '', label: 'All kinds' }, ...KINDS.map((k) => ({ value: k, label: ARCHIVE_KIND_LABEL[k] }))]

/** The filters the URL states; a value the archive cannot read is left out rather than guessed at. */
export function filtersFrom(params: URLSearchParams): ArchiveFilters {
  const clientId = params.get('clientId') ?? ''
  const kind = params.get('kind') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  return {
    ...(clientId ? { clientId } : {}), ...(isArchiveKind(kind) ? { kind } : {}),
    ...(ISO_DAY.test(from) ? { from } : {}), ...(ISO_DAY.test(to) ? { to } : {}),
  }
}

export function withFilter(params: URLSearchParams, key: keyof ArchiveFilters, value: string): URLSearchParams {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value)
  else next.delete(key)
  return next
}
```

- [ ] **Step 4: The table and the page**

Create `src/workspace/archive/ArchiveTable.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { supervisionHref } from '@/workspace/supervision/supervision-items'
import type { Directory } from '@/types/workspace'
import type { ArchiveEntry } from '@/types/workspace-supervision'
import { ARCHIVE_KIND_LABEL } from './archive-filters'

const LINK = 'underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

function recordedBy(entry: ArchiveEntry, directory: Directory): string {
  if (entry.kind === 'sent_message') return personIn(directory, entry.message.authorId).name
  const name = personIn(directory, entry.act.actorId).name
  return entry.act.viaPresenter ? `${name} · via the presenter shortcut` : name
}

function EntryLink({ entry }: { entry: ArchiveEntry }) {
  if (entry.threadId && entry.threadTitle) return <Link to={`/t/${encodeURIComponent(entry.threadId)}`} className={LINK}>{entry.threadTitle}</Link>
  if (entry.kind === 'act' && entry.act.subject?.type === 'alert') return <Link to={supervisionHref('alert', entry.act.subject.id)} className={LINK}>Supervision</Link>
  return <NotApplicable />
}

export function ArchiveTable({ entries, directory }: { entries: ArchiveEntry[]; directory: Directory }) {
  return (
    <DataTable caption="Archive" rows={entries} getRowId={(e) => `${e.kind}:${e.id}`} noun={{ singular: 'record', plural: 'records' }} density="dense"
      columns={[
        { id: 'at', header: 'At', cell: (e) => fmtTimestamp(e.at), sortValue: (e) => e.at },
        { id: 'record', header: 'Record', cell: (e) => (e.kind === 'act' ? e.act.id : e.actId) },
        { id: 'kind', header: 'Kind', cell: (e) => ARCHIVE_KIND_LABEL[e.kind === 'act' ? e.act.kind : 'sent_message'] },
        { id: 'summary', header: 'Summary', wrap: true, cell: (e) => (e.kind === 'act' ? e.act.summary : `Message to ${e.clientName}`) },
        { id: 'actor', header: 'Recorded by', cell: (e) => recordedBy(e, directory) },
        { id: 'fingerprint', header: 'Fingerprint', cell: (e) => (e.kind === 'act' ? e.act.fingerprint : e.fingerprint) },
        { id: 'thread', header: 'Thread', cell: (e) => <EntryLink entry={e} /> },
      ]} />
  )
}
```

Create `src/workspace/archive/ArchivePage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { Select } from '@/kit/select/Select'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { fmtDate } from '@/kit/measure'
import { useArchive, useDirectory } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { isClientViewer } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory } from '@/types/workspace'
import type { ArchiveFilters } from '@/types/workspace-supervision'
import { ArchiveTable } from './ArchiveTable'
import { KIND_OPTIONS, filtersFrom, withFilter } from './archive-filters'

/** Firm-only books and records: a client is told the archive does not exist, and a switch to a client goes home. */
export function ArchivePage() {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const directory = useDirectory()
  const viewerIsClient = directory.data !== undefined && isClientViewer(directory.data, viewerId)
  const switchedToClient = viewerIsClient && viewerId !== openedAs
  useEffect(() => {
    if (switchedToClient) navigate('/', { replace: true })
  }, [switchedToClient, navigate])
  if (switchedToClient || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the archive…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (viewerIsClient) return <ArchiveNotFound />
  return <Archive directory={directory.data} />
}

function Archive({ directory }: { directory: Directory }) {
  const [params, setParams] = useSearchParams()
  const filters = filtersFrom(params)
  const archive = useArchive(filters)
  const set = (key: keyof ArchiveFilters) => (value: string) => setParams(withFilter(params, key, value), { replace: true })
  if (archive.isError && isNotFound(archive.error)) return <ArchiveNotFound />
  const data = archive.data
  const dates = [{ value: '', label: 'Any date' }, ...(data?.dates ?? []).map((d) => ({ value: d, label: fmtDate(d) }))]
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        <VisibilityBand visibility="internal" scale="message" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Archive</h1>
        <p className="text-body text-ink-2">Every recorded act and every message sent to a client, in the order they happened.</p>
      </header>
      {archive.isError ? <p role="alert" className="text-body">{archive.error.message}</p> : null}
      {data ? (
        <>
          <div role="group" aria-label="Archive filters" className="flex flex-wrap items-end gap-4">
            <Select label="Client" layout="stacked" value={filters.clientId ?? ''} onChange={set('clientId')}
              options={[{ value: '', label: 'All clients' }, ...data.clients.map((c) => ({ value: c.id, label: c.name }))]} />
            <Select label="Kind" layout="stacked" value={filters.kind ?? ''} options={KIND_OPTIONS} onChange={set('kind')} />
            <Select label="From" layout="stacked" value={filters.from ?? ''} options={dates} onChange={set('from')} />
            <Select label="To" layout="stacked" value={filters.to ?? ''} options={dates} onChange={set('to')} />
          </div>
          <ArchiveTable entries={data.entries} directory={directory} />
        </>
      ) : archive.isPending ? <p role="status" className="text-body text-ink-3">Loading the archive…</p> : null}
    </div>
  )
}

function ArchiveNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Archive not found</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
```

- [ ] **Step 5: Route, Desk, command line**

`src/app/routes.tsx`: `{ path: 'archive', element: <ArchivePage /> }` (no handle: the thread list stays, no context column). `src/workspace/shell/ThreadList.tsx`: `DESK` gains `{ to: '/archive', label: 'Archive' }`. `src/app/use-destinations.ts`: for firm viewers add `{ id: 'archive', label: 'Archive', aliases: ['records', 'books and records'], run: () => navigate('/archive') }` after Supervision.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/archive.test.tsx src/workspace/__tests__/shell.test.tsx src/__tests__/guardrails --testTimeout 30000`
Expected: PASS. Then the full suite, `pnpm lint`, `pnpm build`.

- [ ] **Step 7: Commit**

```bash
git add src/app src/workspace
git commit -m "feat(archive): the firm-only books-and-records surface, filtered by client, kind and date

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: The story end to end, and the visual baselines

One presenter runs the supervisory loop through the UI: the Phase 3 story to Approve v3 and Robert's letter, then View as Mark → Supervision → the Johnson orders evidence → release with a rationale → the fills in the thread → review Robert's letter → dispose of the AAPL alert → View as Adrian (slips, fills, account view, the Brief changed) → View as Robert (unchanged) → on a fresh session, the presenter shortcut alone. New baselines: Supervision queue and item (light and dark), the archive, the thread after release, the Brief after fills; every Phase 2/3 baseline the Desk pane or the "through" wording changed is regenerated and reviewed.

**Files:**
- Create: `e2e-visual/workspace-steps.ts`, `e2e-visual/compliance-review.spec.ts`
- Modify: `e2e-visual/rebalance-job.spec.ts` (import the shared steps instead of defining them), `e2e-visual/__baselines__/*` (regenerated)

**Interfaces:**
- Produces (`e2e-visual/workspace-steps.ts`, moved verbatim from `rebalance-job.spec.ts`): `type Theme`, `settle(page)`, `visit(page, path, theme)`, `heading`, `conversation`, `context`, `threadLink(page, name)`, `embedOf`, `approvalOf`, `letterDraft`, `askProposalAgent(page, theme)`, `approve(page, version)`, `askForLetter(page)`, `sendLetter(page)`; added: `viewAs(page, label)`, `deskLink(page, name)`, `releaseByShortcut(page)`.

- [ ] **Step 1: Share the story's steps**

Create `e2e-visual/workspace-steps.ts` by moving, unchanged, `Theme`, `settle`, `visit`, `heading`, `conversation`, `context`, `threadLink`, `embedOf`, `approvalOf`, `letterDraft`, `askProposalAgent`, `approve`, `askForLetter` and `sendLetter` out of `e2e-visual/rebalance-job.spec.ts` (each `export`ed), and add:

```ts
export const viewAs = (page: Page, label: string) => page.getByLabel('View as').selectOption({ label })
/** A firm surface from the Desk pane at the top of the thread list. */
export const deskLink = (page: Page, name: 'Supervision' | 'Archive') =>
  page.getByRole('navigation', { name: 'Threads' }).getByRole('link', { name, exact: true })

/** The presenter's shortcut beside pending staged orders: Mark's default release, confirmed. */
export async function releaseByShortcut(page: Page) {
  const panel = approvalOf(page)
  await panel.getByRole('button', { name: 'Demo · act as Mark Davis' }).click()
  await page.getByRole('dialog', { name: /^Release v\d+ as Mark Davis\?$/ }).getByRole('button', { name: 'Confirm' }).click()
  await expect(panel).toContainText('Released by compliance; filled at the day\'s prices.')
}
```

In `rebalance-job.spec.ts` delete the moved definitions and import them from `./workspace-steps`. Run `VISUAL_PORT=5195 pnpm visual -- rebalance-job` once before regenerating anything, to confirm the refactor changed no behaviour (failures now are pixel diffs from the Desk pane and "through", not locator errors).

- [ ] **Step 2: Write the compliance spec**

Create `e2e-visual/compliance-review.spec.ts`:

```ts
import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  approvalOf, approve, askForLetter, askProposalAgent, context, conversation, deskLink, embedOf, heading,
  releaseByShortcut, sendLetter, settle, threadLink, viewAs, type Theme,
} from './workspace-steps'

type Layout = 'supervision' | 'three-panes' | 'list-and-main'
type Scene = { name: string; layout: Layout; open: (page: Page) => Promise<void> }

const queueOf = (page: Page) => page.getByRole('navigation', { name: 'Supervision queue' })
const ordersItem = (page: Page, version: number) => page.getByRole('region', { name: `Orders · Johnson rebalance · v${version}` })

async function approvedV1(page: Page, theme: Theme) {
  await askProposalAgent(page, theme)
  await approve(page, 1)
}

const supervision = (theme: Theme) => async (page: Page) => {
  await approvedV1(page, theme)
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await expect(heading(page)).toHaveText('Supervision')
  await queueOf(page).getByRole('link', { name: /^Johnson rebalance · v1/ }).click()
  await expect(ordersItem(page, 1).getByRole('table', { name: 'Approved legs · v1' })).toBeVisible()
  await settle(page)
}

const archive = async (page: Page) => {
  await approvedV1(page, 'light')
  await releaseByShortcut(page)
  await deskLink(page, 'Archive').click()
  await expect(page.getByRole('table', { name: 'Archive' })).toContainText('Release orders')
  await settle(page)
}

const threadAfterRelease = async (page: Page) => {
  await approvedV1(page, 'light')
  await releaseByShortcut(page)
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v1' })).toBeVisible()
  await settle(page)
}

const briefAfterFills = async (page: Page) => {
  await approvedV1(page, 'light')
  await releaseByShortcut(page)
  await threadLink(page, 'Brief').click()
  await expect(page.getByRole('region', { name: 'Ranked summary' })).toContainText('Every asset class is inside its tolerance band.')
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'supervision-light', layout: 'supervision', open: supervision('light') },
  { name: 'supervision-dark', layout: 'supervision', open: supervision('dark') },
  { name: 'archive-light', layout: 'list-and-main', open: archive },
  { name: 'thread-after-release-light', layout: 'three-panes', open: threadAfterRelease },
  { name: 'brief-after-fills-light', layout: 'three-panes', open: briefAfterFills },
]

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

    for (const width of [1024, 1440]) {
      test(`no page-level horizontal scroll and no clipped labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        expect(await clippedLabels(page)).toEqual([])
      })
    }

    if (scene.layout === 'supervision') {
      test('the item sits beside the queue at 1440px and drops below it at 1024px; no thread list', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await scene.open(page)
        await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
        const [queue, item] = await Promise.all([boxOf(queueOf(page)), boxOf(ordersItem(page, 1))])
        expect(item.x).toBeGreaterThanOrEqual(queue.x + queue.width)
        expect(Math.abs(item.y - queue.y)).toBeLessThanOrEqual(1)
        await page.setViewportSize({ width: 1024, height: 900 })
        const [narrowQueue, narrowItem] = await Promise.all([boxOf(queueOf(page)), boxOf(ordersItem(page, 1))])
        expect(narrowItem.y).toBeGreaterThanOrEqual(narrowQueue.y + narrowQueue.height)
      })
    }
  })
}

test('one presenter closes the supervisory loop; the book moves; Robert sees nothing new; the shortcut works alone', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The Phase 3 story to Approve v3, and Robert's letter sent.
  await askProposalAgent(page, 'light')
  const embed = embedOf(page)
  await embed.getByRole('button', { name: 'Revise' }).click()
  const revise = page.getByRole('dialog', { name: 'Revise the proposal' })
  await revise.getByRole('checkbox', { name: 'Harvest only: sell only lots at a loss' }).check()
  await revise.getByRole('button', { name: 'Ask Proposal Agent to revise' }).click()
  await expect(embed.getByRole('table', { name: 'Proposal legs · v2' })).toBeVisible()
  await embed.getByRole('link', { name: 'Workbench' }).click()
  await page.getByRole('table', { name: 'Legs · v2' }).getByRole('row', { name: /^QAI/ }).focus()
  await page.keyboard.press('x')
  await expect(page.getByRole('table', { name: 'Legs · draft' }).getByRole('row', { name: /^QAI/ })).toHaveAttribute('data-muted', 'true')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('group', { name: 'Draft version' }).getByRole('status').filter({ hasText: 'Saved as v3 · posted to the thread.' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await approve(page, 3)
  await askForLetter(page)
  await sendLetter(page)

  // 2. What Robert sees before compliance acts.
  await viewAs(page, 'Robert Johnson · Client')
  await expect(conversation(page)).toContainText('Dear Robert,')
  const robertBefore = await conversation(page).innerText()

  // 3. Mark: Supervision → the Johnson orders → release with a rationale.
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await expect(heading(page)).toHaveText('Supervision')
  await queueOf(page).getByRole('link', { name: /^Johnson rebalance · v3/ }).click()
  const orders = ordersItem(page, 3)
  await expect(orders.getByRole('table', { name: 'Approved legs · v3' })).toBeVisible()
  await expect(orders).toContainText('Adrian Hale, Advisor')
  await expect(orders).toContainText('This is the record of what was approved. The checks are not run again here.')
  const release = orders.getByRole('region', { name: 'Record a disposition' })
  await expect(release.getByRole('button', { name: 'Record disposition' })).toBeDisabled()
  await release.getByLabel('Rationale (required)').fill('Harvest-only version; legs, tax effect and the INTC restriction reviewed.')
  await release.getByRole('button', { name: 'Record disposition' }).click()
  await page.getByRole('dialog', { name: 'Release orders?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(page.locator('#act-REC-0003')).toBeFocused()
  await expect(orders).toContainText('FILLED')

  // 4. The fills in the team thread.
  await orders.getByRole('link', { name: /Team thread/ }).click()
  await expect(heading(page)).toHaveText('Johnson Rebalance Review')
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v3' }).getByRole('table', { name: 'Fills · v3' })).toContainText('INTC')

  // 5. Robert's letter, reviewed after it was sent.
  await deskLink(page, 'Supervision').click()
  await queueOf(page).getByRole('link', { name: /^Message to Robert Johnson/ }).click()
  const letter = page.getByRole('region', { name: 'Correspondence · Message to Robert Johnson' })
  await expect(letter).toContainText('Dear Robert,')
  await expect(letter).toContainText(/from v3 · fingerprint/)
  const review = letter.getByRole('region', { name: 'Record a disposition' })
  await review.getByLabel('Rationale (required)').fill('Accurate and balanced; conditional while the orders were pending.')
  await review.getByRole('button', { name: 'Record disposition' }).click()
  await page.getByRole('dialog', { name: 'Mark reviewed?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(queueOf(page)).toContainText('Nothing sent is waiting for review.')

  // 6. The AAPL alert, disposed of onto its record trail.
  await queueOf(page).getByRole('link', { name: /^Single-name concentration — AAPL in Johnson Trust/ }).click()
  const alert = page.getByRole('region', { name: 'Alert · Single-name concentration — AAPL in Johnson Trust' })
  const dispose = alert.getByRole('region', { name: 'Record a disposition' })
  await dispose.getByLabel('Rationale (required)').fill('Long-held position; the IPS exception is documented and reviewed annually.')
  await dispose.getByRole('button', { name: 'Record disposition' }).click()
  await page.getByRole('dialog', { name: 'Approve?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(alert.getByRole('list', { name: 'Record trail' })).toContainText('Approved')

  // 7. Adrian: Mark's slip and the fills, the account view, the Brief changed.
  await viewAs(page, 'Adrian Hale · Advisor')
  await page.getByRole('link', { name: 'Advisor Desktop' }).click()
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(conversation(page).getByRole('article', { name: 'Released the orders staged from v3 of the Johnson rebalance' })).toContainText('Mark Davis, Compliance')
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v3' })).toBeVisible()
  await expect(approvalOf(page)).toContainText('v3 was released by compliance and filled')
  await context(page).getByRole('link', { name: /^Robert Johnson Individual/ }).click()
  const holdings = page.getByRole('table', { name: 'Holdings' })
  await expect(holdings.getByRole('row', { name: /^VWO/ })).toHaveCount(1)
  await expect(holdings.getByRole('row', { name: /^INTC/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await threadLink(page, 'Brief').click()
  await expect(page.getByRole('region', { name: 'Ranked summary' })).not.toContainText('Intel Corp. can be sold at a loss today')
  await expect(conversation(page)).toContainText('INTC loss sale of 2026-02-25, open through 2026-03-27')

  // 8. Robert: exactly what he saw before.
  await threadLink(page, 'Robert Johnson').click()
  await viewAs(page, 'Robert Johnson · Client')
  await expect(conversation(page)).toContainText('Dear Robert,')
  expect(await conversation(page).innerText()).toBe(robertBefore)
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await expect(page.locator('body')).not.toContainText(/supervision|rationale|\bfills\b|presenter|escalat|release orders/i)

  // 9. A fresh session: the presenter shortcut, alone.
  await page.reload()
  await expect(heading(page)).toBeVisible()
  await viewAs(page, 'Adrian Hale · Advisor')
  await threadLink(page, 'Johnson Rebalance Review').click()
  await expect(conversation(page).getByRole('article', { name: /^Fills · / })).toHaveCount(0)
  await context(page).getByRole('button', { name: 'Ask Proposal Agent' }).click()
  await expect(embedOf(page).getByRole('table', { name: 'Proposal legs · v1' })).toBeVisible()
  await approve(page, 1)
  await releaseByShortcut(page)
  const slip = context(page).getByRole('article', { name: 'Released the orders staged from v1 of the Johnson rebalance' })
  await expect(slip).toContainText('Mark Davis, Compliance')
  await expect(slip).toContainText('Demo · recorded through the presenter shortcut by Adrian Hale')
  await expect(conversation(page).getByRole('article', { name: 'Fills · Johnson rebalance v1' })).toBeVisible()
})
```

- [ ] **Step 3: Run the story first, then the baselines**

Run: `VISUAL_PORT=5195 pnpm visual -- compliance-review -g "one presenter"`
Expected: PASS. A failure here is a behaviour defect in Tasks 10–13; fix it in the owning task's files, with its test, before touching any baseline.

Then: `VISUAL_PORT=5195 pnpm visual`
Expected: the new scenes fail for missing baselines; Phase 2/3 scenes whose thread list now shows the Desk pane (`brief-*`, `proposal-thread-*`, `adrian-johnson-finding-*`, `account-full-view-light`) or the "open through" citation (`brief-*`, `adrian-johnson-finding-*`) fail on pixels; `workbench-*`, `robert-*` and `kit-*` should not change (the workbench hides the thread list; Robert has no Desk) — if one does, find out why before updating it.

- [ ] **Step 4: Regenerate and review every baseline that changed**

Run: `VISUAL_PORT=5195 pnpm visual:update`, then open every PNG it wrote under `e2e-visual/__baselines__/` and check: the Desk pane (Supervision, Archive) at the top of firm viewers' thread lists; "open through" in the Brief's citations; `supervision-light`/`-dark` show the queue's four groups on the left and the v1 orders item on the right with its approval record, legs, tax tape and the disposition panel; `archive-light` lists approve, release with Mark Davis · via the presenter shortcut; `thread-after-release-light` shows Mark's slip with the rationale and the shortcut line, then the fills table, and the panel reading FILLED; `brief-after-fills-light` reads "Every asset class is inside its tolerance band." with no INTC harvest. Then `VISUAL_PORT=5195 pnpm visual` once more: all green.

- [ ] **Step 5: The full gate**

Run: `pnpm vitest run --testTimeout 30000`, `pnpm lint`, `pnpm build`, `VISUAL_PORT=5195 pnpm visual`.
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add e2e-visual
git commit -m "test(visual): the compliance story end to end; Supervision, archive, after-release and Brief baselines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes (for the executor)

- **Spec coverage.** Session portfolio ledger, invariants and reset: Tasks 1–3. Fills: Task 3. The five compliance acts with 403/404/409 and append-only records carrying rationale, evidence fingerprint and `viaPresenter`: Tasks 4–5 (and the 405 catch-all, Task 8). The four endpoints: Task 8. Supervision (queue groups and Disposed today, side-by-side item, orders/alert/correspondence evidence, disposition panel with required rationale, confirm, focus to the slip): Tasks 11–12. Archive with filters: Tasks 6, 13. Team thread after release (Mark's slip, fills message, "Filled"): Tasks 4, 10. Presenter shortcut: Tasks 8, 10. Effects of the moved book (account view, drift, Brief re-measure, INTC no longer offered, recorded window through 2026-03-27, the new proposal from the new book, Robert unchanged): Tasks 2–4, 7, 10, 14. Phase 3 carry-overs: Drift Monitor "through" and the Brief re-baseline (Tasks 7, 14), harvest-plus-substitute (Task 9). Testing: engine (Tasks 1–9), whole-book release (Task 3), UI end to end (Task 14), visual baselines (Task 14).
- **Parked Phase 3 minors taken because they touch these files:** withdrawn staged orders now name their closing act (Task 1); `withdraw_approval` answers 403 before 409 to a firm viewer who may not withdraw (Task 1); `/acts` answers a client 404 for every body (Task 8); the Drift Monitor's "open to" (Task 7). Not taken (not in Phase 4's files): letter-sentence test granularity, spouse first-name helper, HeldAwayList loading pane, "realised/modelled" spellings on firm surfaces, client-visible global record ids.
- **Names that cross tasks:** `applyFills` / `FillInput` / `LedgerInvariantError` (Task 3 → 4); `releaseOrders`, `returnToAdvisor`, `escalate`, `disposeAlert`, `reviewCorrespondence`, `ActOptions`, `ComplianceFailure`, `Recorded` (Tasks 4–5 → 6, 8); `supervisionQueue`, `archiveFor`, `ARCHIVE_KINDS`, `isArchiveKind` (Task 6 → 8); `CCO_DEFAULT_RATIONALE`, `actAsCco` (Task 8); `useSupervision`, `useArchive`, `useRecordComplianceAct`, `useActAsCco` (Task 8 → 10–13); `supervisionHref`, `findItem`, `FoundItem`, `ITEM_HEADING` (Task 11 → 12–13); `FILL_SIDE_WORDS` (Task 1 → 10, 11).
- **Event-clock arithmetic the tests rely on:** the seed ends at sequence 4; the story's operations take sequences 5–9 (create, revise, save, approve and its marker); a release takes the next two for its act and marker and its fills start at sequence 150, `2026-02-25T14:30:00.000Z`. Tests that assert fill times assume nothing else consumed 140 minutes of events first — true for every fixture here.
