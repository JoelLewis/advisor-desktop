# Phase 3: brief, rebalance and harvest, client thread

**Date:** 12 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 3)
**Builds on:** Phase 2 (`2026-10-11-phase-2-workspace-shell-design.md`) and Phase 0 (`2026-10-11-phase-0-scenario-truth-design.md`, merged to `main` and into `workspace`)

## Goal

The acc-002 story end to end, driven by one presenter as Adrian Hale: the morning brief surfaces
the drift breach and the INTC harvest; a proposal agent drafts a tax-aware rebalance in the team
thread; Adrian steers it by constraint or edits it in a power-user workbench linked live to the
thread; Adrian approves one exact version as a recorded act and the orders are staged pending
compliance; a client-letter agent drafts Robert's message from the approved figures; Adrian sends
it as a recorded act. Robert sees only that message.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Who builds the proposal | A scripted Proposal agent drafts it; Adrian reviews, adjusts and approves |
| Demo model | One presenter. Every interactive step is Adrian's or an agent's. Other people's contributions are seeded; "view as" shows visibility, it never hands work to another person |
| Where the job ends | Approved and staged `pending_compliance`; nothing released. Client message sent. Phase 4 adds the compliance disposition and release |
| How Adrian adjusts | Both: ask the agent to revise under constraints (in the thread), or edit in the workbench (full view) — linked in real time |
| Workbench placement | Side by side: workbench in the main pane, the live thread in the right column |
| Brief | Ready on load at the frozen morning (2026-02-25); each finding has "Take to team thread" |
| Client message | A Client Letter agent drafts into the firm-only drafts panel from the approved version; Adrian edits and sends |
| Scope | acc-002 only. Washing, restrictions and held-away notes still consider the whole wash-sale taxpayer and household |

## Engine

### Proposals and versions

`src/mocks/data/proposals-store.ts`, part of the workspace session store (reset with it):

```ts
type ProposalConstraint =
  | { kind: 'harvest_only' }
  | { kind: 'cap_realised_gains'; usd: number }
  | { kind: 'exclude_asset_class'; assetClass: string }
  | { kind: 'avoid_self_wash' }                       // always on for agent drafts
type LegEdit =
  | { kind: 'exclude'; symbol: string }
  | { kind: 'quantity'; symbol: string; quantity: number }
  | { kind: 'lots'; symbol: string; lotIds: string[] }   // specific identification
type ProposalVersion = {
  n: number
  author: { kind: 'agent'; agentId: AgentId } | { kind: 'person'; personId: string }
  createdAt: string                                    // event clock
  constraints: ProposalConstraint[]
  edits: LegEdit[]
  preview: RebalancePreview                            // engine output, see below
  pretrade: PreTradeCheckProposalResult
  fingerprint: string                                  // over account, constraints, edits, legs
  changeSummary: string                                // no digits; figures live in `preview`
}
type Proposal = { id: string; accountId: string; threadId: string; versions: ProposalVersion[] }
```

- `preview` is the engine's tax-aware rebalance preview after `settleBatchWashSales`: legs (with
  `washedLoss`, `repurchaseBlockedUntil`, `washSaleRisk`), the return-level tax estimate against
  year-to-date results, and `projectedDrift` with residual reasons. The UI never computes figures.
- Versions are append-only. Every new version re-runs the preview and the proposal-level pre-trade
  check.
- The generator gains constraint support: `harvest_only` (loss sales only, plus the buys that keep
  the account inside its bands without washing), `cap_realised_gains` (trim gain legs, highest
  gain per dollar last), `exclude_asset_class`, `avoid_self_wash` (never propose a buy that washes
  one of its own loss sales, within the account or the wash-sale taxpayer's other accounts).
- Workbench edits are applied on top of the agent's legs and re-validated by the engine (a quantity
  above the held quantity, or a lot not in the position, is a 400 with a reason).

### Binding acts

- `approve_proposal` `{ proposalId, version, fingerprint }`: only the advisor; only when the
  version's pre-trade result has no `block`; records an act (REC-…) in the team thread.
- Approval stages orders with status `pending_compliance`. No order is released in Phase 3.
- `withdraw_approval`: only the approver; removes the staging.
- A version newer than the approved one does not change the approval; the thread and workbench
  state "approval applies to v{n}; v{m} is unapproved". Approving the newer version withdraws the
  older approval in the same act.

### Agents (scripted, deterministic, digit-free claims)

| Agent | Where | May | May not |
|---|---|---|---|
| Harvest Scanner | Brief | measure harvestable losses and their windows | stage trades; post in a client thread |
| Proposal | team thread | draft and revise proposals under constraints | approve; release; post in a client thread |
| Client Letter | drafts panel of a client thread | draft a client message from an approved version | send; post in a client thread |

- Harvest Scanner reports per account the loss allowed now, the washed part, the repurchase
  window, the household restrictions, and held-away assets as "not visible to wash-sale checks".
- The Client Letter draft is tied to `{ proposalId, version, fingerprint }`. If that version is no
  longer the approved one, the draft is marked stale and `send_to_client` refuses it (409).
- Agent claim wording follows engine semantics (Phase 2/0 rulings): no "cleared", no "would exceed"
  on an approaching limit, `cash_capped` reads "held to the model's cash target".

### API (viewer-filtered; client viewers get 404)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/workspace/proposals?threadId=` | proposals in a visible firm thread |
| GET | `/api/workspace/proposals/:id` | proposal with versions |
| POST | `/api/workspace/proposals` | `{ threadId, accountId }` → v1 by the Proposal agent |
| POST | `/api/workspace/proposals/:id/revise` | `{ constraints }` → new agent version |
| POST | `/api/workspace/proposals/:id/versions` | `{ edits }` → new person version (Adrian) |
| POST | `/api/workspace/proposals/:id/preview` | `{ edits }` → draft preview, not saved |
| POST | `/api/workspace/acts` | `approve_proposal`, `withdraw_approval` added |
| POST | `/api/workspace/threads/:id/findings/:messageId/carry` | carry a Brief finding into a team thread |

## The story in the threads

1. **Brief (private), ready on load.** Drift Monitor (acc-002 US Equity outside its band), Harvest
   Scanner (7,000 INTC with its window and the household restriction), and a ranked summary. Each
   finding has **Take to team thread**: the Johnson Rebalance Review receives it as a quoted card
   with who carried it and when.
2. **Johnson Rebalance Review (internal).** Sarah's seeded note stays. **Ask Proposal agent** posts
   v1 as a proposal embed: legs, realised gains and losses, the return-level tax estimate,
   repurchase dates, pre-trade per leg, drift before and after with reasons, **Workbench ↗**.
   **Revise** offers the constraints; the agent posts the next version with a change summary.
   Workbench saves appear as version lines; the embed always shows the latest version.
3. **Approve.** In the context column, for the advisor only: **Approve v{n}** (disabled with the
   reason when pre-trade blocks). A RecordSlip records it; the staged orders show
   "pending compliance review".
4. **Robert's thread (client).** The Client Letter agent drafts into the drafts panel from the
   approved version: what changes and why in plain language, the INTC loss and the date before
   which INTC must not be bought back, a note that dividend reinvestment and held-away accounts
   can also trigger a wash sale, and the disclosure (estimates, not tax advice; federal rates; state
   tax not modelled). Adrian edits and sends (`send_to_client`). As Robert: only that message.

## The workbench (full view)

- Route `/proposals/:proposalId?from=<threadId>` inside the shell. The workbench takes the main pane;
  the thread moves to the right column as a live compact feed with its composer. Below the split
  breakpoint the thread drops under the workbench.
- **Legs table** (kit DataTable, keyboard): symbol and name, side, quantity, value, realised result
  by character, washed part, repurchase-blocked-until, pre-trade status. Expanding a sell leg shows
  its tax lots with specific-ID selection. Per leg: exclude/include, quantity override.
- **Summary:** tax tape (realised ST/LT, washed, return-level estimate against YTD), drift before and
  after on a shared-scale gauge set with residual reasons, household repurchase restrictions
  (recorded and projected, with sources), held-away assets flagged.
- **Editing:** edits form a draft version previewed live by the engine. **Save as v{n}** posts the
  version line to the thread; **Discard** drops it. The workbench never approves.
- **Real time:** both panes read the same viewer-scoped queries; any version or act invalidates
  `['workspace']`, so the embed, the version lines and the workbench update together.
- **Keyboard:** command line destination "Proposal · Johnson rebalance"; in the table `x` toggles
  exclusion, `Enter` expands lots, `mod+S` saves the version.
- Client viewers get not found.

## Carry-over (from the roadmap and earlier phases)

- Post-trade drift on the construct step (delivered by Phase 0; shown here).
- DRIP and held-away accounts in the client's wash-sale guidance.
- Restore the guard that every NBA `actionRoute.path` resolves to a real workspace route.
- nba-002 priority and impact score derived from the engine (this year's saving; carryforward
  noted), replacing the literal `high` / 75.
- The Proposal agent avoids self-washing trades (Phase 0 ruling deferred it here).

## Testing

- **Engine invariants:** each version's preview equals a fresh engine run on its legs; the
  fingerprint changes with any leg, lot, edit or constraint; approval only on a BLOCK-free version;
  a newer version leaves the approval on the older one and is reported as unapproved; staged orders
  are `pending_compliance` and never released; proposal endpoints 404 for a client; the Proposal
  agent never proposes a buy that washes its own loss sale (whole book); Client Letter figures equal
  the approved version's; a stale draft cannot be sent; every agent claim is digit-free.
- **Agents over the whole book:** Harvest Scanner and the Proposal agent run for every account
  without error; each claim checked against the engine figures it cites.
- **UI end to end:** Brief → take to thread → v1 → revise (v2) → workbench edit (v3, embed updates
  live) → approve → draft → send → view as Robert (only the message) → view as Mark (firm threads,
  staged orders pending compliance). Keyboard paths in the workbench.
- **Visual baselines** (both themes where listed): Brief; team thread with a proposal embed;
  workbench side by side; Robert's thread. Plus the 1024px layout checks.

## Out of scope

- Compliance dispositions, releasing orders, fills (Phase 4).
- Household-level or multi-account batch proposals.
- Fixture realism items deferred to Joel (40 of 47 accounts out of band, seed prices,
  transaction history vs lots).

## Success criteria

- One presenter as Adrian runs Brief → proposal → revise → workbench → approve → letter → send
  without leaving the workspace.
- Every figure on screen comes from the engine; no agent claim contains a digit.
- Viewing as Robert shows exactly the one message; viewing as Mark shows the staged orders pending
  compliance and not the Brief.
