# Phase 0: scenario truth

**Date:** 11 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md`

## Goal

Make the engine and mock data correct and complete for every workspace job before any new screen
displays them. All work is on a short-lived branch from `main` (with this spec cherry-picked onto it),
merged to `main` test-first, then merged into `workspace`. No UI work: the old screens pick up engine changes,
and their tests are updated only where a figure legitimately moves (with the arithmetic in the commit).

## Scope

### 0.1 Integrate the three finished background branches

| Branch | Content |
|---|---|
| `claude/gifted-allen-alrj6w` (remote) | Proposal-level pre-trade check for multi-leg rebalances |
| `claude/funny-turing-de0c7d` (local worktree) | Harvest scanner tests each lot's own sale under §1091; a loss window blocks the repurchase, not the sale; the proposal's tax estimate includes year-to-date realised results |
| `claude/magical-darwin-aqi3rn` (remote) | acc-001 drift and rebalance trades in AI fixtures derived from the engine |

- Each branch is reviewed against `main` (branch-wide code review with the finance-skills references),
  rebased, and merged one at a time with the full suite green between merges. All three touch
  `src/mocks/handlers/oms.ts` or the tax code, so conflicts are resolved against the newer engine
  contracts on `main` (signed `realisedShortTerm`/`realisedLongTerm`, `grossTaxOnGains`,
  `taxable`, `washSaleRisk`, the 31-day replacement hold).
- After each merge, re-pin acc-002: net and gross tax, pre-trade results per leg, scanner labels.
  Record before → after in the merge commit.
- The flaky-test session (no commits yet) is not part of this phase; if it lands, it is reviewed the
  same way.

### 0.2 A loss sale opens its own wash-sale window

- Every proposed sell leg that realises a loss carries `repurchaseBlockedUntil: string` (ISO date:
  sale date + 30 days, inclusive window per IRC §1091). Other legs omit it.
- The household's restriction list distinguishes recorded windows (from `realisedSales`) from
  projected windows (from the proposal), each with its source.
- **Test:** acc-002's INTC sale on 2026-02-25 yields `repurchaseBlockedUntil: '2026-03-27'`; the
  rs-001 window (to 2026-03-23) stays separate and is labelled recorded.

### 0.3 People, roles and permissions

- A team directory (`src/mocks/data/people.ts` or an extension of the existing user data) with role
  and permissions for each person:

  | Person | Role | May |
  |---|---|---|
  | Adrian Hale (`user-001`, renamed from the former demo name) | Advisor of record | approve proposals; send to clients |
  | Sarah Mitchell (`user-002`) | Client service associate | draft; schedule; may not approve or send |
  | Mike Chen (`user-003`) | Analyst | research; may not approve or send |
  | Mark Davis | Chief compliance officer, supervisory principal | dispose of compliance exceptions; supervisory review |
  | Robert Johnson (`cli-001`) | Client | receive client communications only |

- Mark Davis already appears as the reviewer in supervision records (`sr-001`–`sr-003`). He gets a
  stable ID and those records reference it. No new people are invented.
- A service exposes the directory and a `can(personId, act)` check. Acts:
  `approve_proposal`, `dispose_exception`, `send_to_client`, `supervise`.

### 0.4 Model display names

Every model reference resolves to its display name (`mod-002` → "Growth") through a service. A test
asserts every model ID used by an account has a name.

### 0.5 Recorded event times

- A deterministic event clock in `src/lib/clock.ts`: `eventTime(sequence: number)` returns the frozen
  now (2026-02-25T12:00:00Z) plus `sequence` minutes. Recorded acts in a job take successive sequences,
  so approval, disposition and sending have distinct, ordered times.
- The live system clock is still never read.

### 0.6 Two domain fixes

- **Tax rates.** `taxRateFor` adds the 3.8% net investment income tax to long-term gains (23.8%) but
  not to short-term (37%). Short-term becomes 40.8%. Expose the rate basis
  (`{ shortTerm, longTerm, includes: ['federal', 'niit'], excludes: ['state'] }`) so screens can state
  it. Every pinned tax figure that moves is re-derived in its test.
- **Post-trade drift.** The rebalance preview returns projected drift by asset class after the
  proposed trades, computed with the same drift function as current drift applied to the post-trade
  holdings. Every asset class that remains outside its band after the trades carries a machine-readable
  reason (`not_market_tradable`, `cash_capped`, `replacement_hold`, `below_lot_size`).
  **Tests:** (a) for every account, projected drift equals the drift function run on holdings with the
  trades applied; (b) for acc-002, projected max drift is lower than current max drift, and
  private-equity drift remains with reason `not_market_tradable`.

### 0.7 Contradicting data, fixed at source

| Where | Problem | Fix |
|---|---|---|
| `messages.ts` msg-003 (thread-001, Robert's account) | Discusses trimming AAPL and MSFT at "3.2% over target": acc-001's holdings, not acc-002's | Rewrite to acc-002's actual drift and holdings, derived from the engine, or move it to an acc-001 thread |
| `nbas.ts` nba-001 | "drifted beyond the 3% threshold" against per-model bands (acc-002: 5%) | State each account's own band; derive the count from the engine |
| `activities.ts` | "Sold 500 shares INTC … Realized loss: $6,820" against rs-001's 5,000 shares and −$32,750 | Derive from rs-001 |
| Custodian transactions | INTC opening transaction dated 2025-12-27 against its 2022-07-25 lot | Opening transaction matches the lot's purchase date |
| `nbas.ts` nba-002 | Harvest recommendation reads as if nothing was harvested | Refer to the remaining 7,000 shares and the 2026-02-21 partial harvest |

Each fix gets an invariant test that ties the copy to the engine.

## Out of scope

- Any workspace code (that lives on branch `workspace`).
- DRIP and held-away account guidance (client-communication content in phase 3).
- Netting across separate taxpayers (individual vs trust) beyond what branch `funny-turing` already
  does.

## Success criteria

- All three branches merged, suite green, acc-002 before → after recorded.
- Every item in 0.2–0.7 has a test that fails without its fix.
- `pnpm lint`, `pnpm build`, full `vitest run` green; no hand-typed figure added.
