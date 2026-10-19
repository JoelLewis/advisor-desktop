# Phase 10: household first

**Date:** 17 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Input:** `docs/audits/2026-10-16-advisor-perspective-review.md`. That review was written by a lead advisor at an independent RIA. Its "one change" was: "make the household, not the account or the thread, the unit everything reconciles to."
**Builds on:** Phase 9, advisor clarity, on branch `workspace`. Phase 10 starts once Phase 9 is reviewed and pushed. `main` is untouched until the user approves the branch.

## Goal

The advisor lands on their book of households, not on a feed of conversations. Opening a household shows where it stands across every account. That covers holdings by asset class against target, risk against tolerance, open orders and today's fills, decisions, tasks and the last client contact. Its conversations are attached to it.

Every agent and every client letter reads one household ledger, so nothing an agent says can contradict what actually happened.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Shell | The left column has two modes, **Households · Conversations**, and opens on Households. Each person's choice is remembered |
| The Brief | Kept as it is (Today · Needs a decision · Context). Households mode gets its own ranked queue |
| Holdings on the household page | Shown first by asset class against the household target, with drift. Each row expands to the accounts holding it |
| Phasing | Phase 10 builds the shell, the queue, the household page and the one ledger. Phase 11 builds household-level rebalancing across account types |

## 1. Shell

- **The left column's two modes.** A mode switch heads the column: a two-option segmented control with `aria-pressed`, operable from the keyboard.
  - **Households** opens first: the queue, then every household A–Z.
  - **Conversations** shows the Phase 9 thread list: Just me · Larkfield team · Client conversations.
- **Household rows.** Each row shows:
  - the household name;
  - managed value;
  - one status line naming why it is here today, e.g. "Decision waiting · Robert waiting 8h · review 14:00 ET";
  - small text markers for out-of-band drift, open compliance items and open tasks. Color is never the only signal.
- **Remembered mode.** The chosen mode is kept per viewer in localStorage.
- **Outsiders** (clients and prospects) do not get the switch. They see only their conversation, as today.
- **Phones.** On a phone the Threads tab becomes the same two-mode column.
- **The Brief** stays reachable from both modes and from home. The home page's five-minute path updates to start from Households.

## 2. Household queue

- **What it ranks.** The engine derives one entry per household that needs the advisor today, ordered as follows:
  1. decisions waiting: an unapproved proposal, or a suitability reason due (Phase 9);
  2. **clients waiting for a reply**: an external party's message with no firm reply after it, shown with how long they have waited;
  3. meetings today;
  4. compliance items about the household: open alerts, returned or escalated orders;
  5. tasks due today or overdue.
- **Ties and the empty queue.** Within a tier, entries are ordered by age. A household with nothing due is not in the queue but stays in the A–Z list.
- **Each entry** gives its reason in one line, with figures from the kit, and opens the household page.
- **Firm only.**
- **Live.** It re-reads after acts and clock jumps. After the release, the Johnsons' decision drops off and the meeting remains.

## 3. Household page as the main view

The household page is the existing `/households/:id` route, rebuilt.

- **Header:**
  - the household name;
  - members, each a client in their own right (Robert and Patricia);
  - managed and held-away value;
  - the client's tolerance, and the household risk figure with its status from Phase 9.
- **Holdings by asset class:**
  - household totals per asset class against the household target, with drift and status;
  - each row expands to the accounts holding it (individual, IRA, Roth, trust; held-away marked "outside the firm's view") with value and weight;
  - **open orders** and **today's fills** shown against the holding they change ("working: sell 758 SPY", "filled 09:40 ET: sold 7,000 INTC");
  - the household target is the value-weighted model targets of its managed accounts, stated in Methods.
- **Needs a decision:** this household's decide items (the Brief's grouping, filtered to the household), each opening its thread.
- **Tasks and open items:** meeting follow-ups, onboarding items and open compliance items, with owner and due date.
- **Meetings:** the next and the last, with links.
- **Last client contact:** who, when and in which conversation, plus any client still waiting.
- **Conversations about this household:** in the right column, each with its Phase 9 visibility words. A new conversation can start here. Its subject is the household; the advisor chooses Just me, Larkfield team, or a client conversation with a named member.
- **Firm only.** Outsiders get "not found", unchanged.

## 4. One household ledger

### The ledger

- **One read model** in the engine, `householdLedger(householdId)`. It holds:
  - positions and lots per account;
  - held-away accounts;
  - open (working) orders;
  - today's fills;
  - realized sales and their wash-sale windows;
  - cash.
- It reads through the existing session portfolio ledger. It is not a second store.

### Every agent reads it

Meeting Prep, Meeting Notes, Drift Monitor, Harvest Scanner, the Proposal Agent, Pre-trade Check, the Client Letter agent and the Brief all build from the ledger. Where an agent states something about trades, fills or holdings, the statement is derived from the ledger at the time it speaks.

### Consistency fixes the advisor found

- **The blotter and holdings agree.** Every filled order shows in holdings: the UST-10Y fill is either added to a position or its seed corrected. Every position acquired in the session has its order: the SMH replacement buy gets its ticket. A test sweeps every account.
- **The rebalancer accounts for working orders.** A working order's quantity counts toward the proposal, so a proposal never doubles a pending QQQ order. Pre-trade Check warns when a proposal overlaps a working order.
- **Meeting notes check what filled.** Meeting Notes states "this morning's rebalance" only if fills exist that day. If the review is held before the release, the line reads as a plan ("the rebalance is approved and awaiting compliance release"). The seeded transcript stays as spoken, and the notes never assert what the ledger contradicts.
- **The recap goes to both spouses.** Patricia is a client in her own right.
  - The recap is sent to a household conversation with Robert and Patricia, or to each spouse's own thread.
  - **Ruling for the plan:** Patricia gets her own client thread (a seeded `cli-002` thread), and the recap is sent to both threads as one recorded act with two deliveries.
  - "View as" gains Patricia.
  - Her decisions ("no trades in Patricia's accounts until her risk profile and models are reviewed") reach her.
- **Notes agree with Risk.** Meeting Notes' line on Patricia's accounts is checked against the household risk view. It states what the Risk view shows and never repeats a transcript claim the ledger contradicts.

### Guard

A story-replay test runs the README path. It asserts that every agent claim and letter line about trades, fills or holdings agrees with the ledger at the moment it was made.

## 5. Smaller items from the review

- **Unanswered client messages.** They surface in the queue (section 2) and on the household page.
- **The agents roster.** "Agents on this desk" moves out of the everyday left column to a single **Agents** page. That page is reachable from the command line and the Firm group, and lists each agent with what it can and can't do. Thread headers keep the agents in that thread.
- **Practice.** The household-share HHI and "effective number of households" lines become "Largest clients' share of revenue" (top 3 and top 5), derived the same way.

## Testing

- **Unit:**
  - queue derivation and ordering, including a client waiting and how long, and live updates after acts and clock jumps;
  - household holdings by asset class against the value-weighted target, account breakdown, and held-away marked;
  - open orders and today's fills placed on the right holding;
  - the ledger: every agent reads it;
  - blotter and holdings agreement across every account;
  - the rebalancer with a working order;
  - meeting notes before and after the release;
  - the recap delivered to both spouses as one act;
  - Patricia's View as and her boundary (she sees only her thread);
  - the mode switch, remembered per viewer;
  - outsiders get no switch and "not found" on household pages.
- **Story replay:** the ledger agreement guard.
- **Visual baselines (new):**
  - Households mode (light and dark);
  - the household page, Johnson, before and after the release (light and dark);
  - an expanded asset-class row;
  - the Agents page;
  - Patricia's view;
  - phone Households.

  Existing baselines are regenerated where they move, and every changed PNG is looked at. axe stays green.
- **README:** the five-minute path starts from Households. `readme-path.spec.ts` follows it.

## Out of scope (Phase 11 or later)

- Household-level rebalancing across account types (asset location solved across accounts), which is Phase 11.
- Block trading and allocation.
- Billing exceptions beyond the schedule.
- CRM, custodian and planning-tool integrations.
- Anything touching `main`.

## Success criteria

- An advisor lands on their households and can tell in seconds which need them today and why.
- The Johnson household page answers "where do they stand" without reading a conversation.
- No agent claim or client letter contradicts the ledger, and a test proves it across the story.
- Patricia, a client in her own right, receives what concerns her.
