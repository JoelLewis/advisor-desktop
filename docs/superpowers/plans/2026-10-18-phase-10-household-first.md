# Phase 10: Household First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The advisor lands on a book of households rather than a feed of conversations; the Johnson household page answers "where do they stand" without reading a thread; every agent claim and client letter is read from one household ledger, and a story-replay test proves none contradicts it; Patricia, a client in her own right, receives what concerns her.

**Architecture:** One engine read model, `householdLedger(householdId)` and `accountLedger(accountId)` (`src/mocks/workspace/household-ledger.ts`), reads through the session portfolio ledger, the OMS tickets and the staged proposal orders; it is a view, not a store. The consistency fixes (blotter against holdings, working orders in the rebalancer, notes that check fills, agents that read today's fills) land first and are pinned by tests. Then the UI that shows them: a household queue derived by the engine (`householdBook`), a left column with two modes (`BookColumn`), the rebuilt `/households/:id` page with its conversations in the right column, a single Agents page, and Practice's revenue concentration. A story-replay guard re-runs the README path through the engine and checks each claim against the ledger at the moment it was made.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4 tokens, TanStack Query 5, React Router 6, MSW 2 as the in-browser server, Vitest 4 + Testing Library, Playwright visual baselines with `@axe-core/playwright` on every scene, knip 6.39.0 via `pnpm dlx`, wrangler 4.

**Spec:** `docs/superpowers/specs/2026-10-17-phase-10-household-first-design.md` (binding). Its input: `docs/audits/2026-10-16-advisor-perspective-review.md`. It builds on Phase 9: `docs/superpowers/specs/2026-10-15-phase-9-advisor-clarity-design.md` and `docs/superpowers/plans/2026-10-15-phase-9-advisor-clarity.md`.

## Global Constraints

- Work only on branch `workspace`, base = the commit that adds this plan (its parent is `55ab98b`). `git log --oneline -1` before starting; report BLOCKED if a prerequisite task's commit is missing. Nothing is committed to `main`; `main` is never touched, read from for merges, or pushed. Implementers never push; the controller pushes `workspace` only once the user approves the branch.
- Stack: React 18, TypeScript strict, Vite, Tailwind v4 tokens, TanStack Query 5, React Router 6, MSW 2 as the in-browser server, Vitest, Playwright visual baselines with axe on every scene. No dependency is added in this phase.
- knip is clean at the end of every task: an exported name has an importer outside its own file (a test counts). A type a later task needs stays module-private until that task, which exports it when it imports it.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums (`as const` arrays and unions); ESM; no barrel files. `.tsx` files export only components; helpers, words and types go in `.ts` siblings. Errors are explicit types or `throw new Error(...)` naming the broken invariant, never silent catches or silent fallbacks (`?? ''` on a value that must exist is a silent fallback). A storage refusal is caught only as `DOMException`, with any other error rethrown.
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`), `pnpm type-check`, `pnpm build` and `pnpm dlx knip@6.39.0 --no-progress` (no output). A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. Restore `wrangler.jsonc` with `git checkout -- wrangler.jsonc` if a tool modifies it. Never symlink `node_modules` between worktrees.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`, `threshold: 0`). Regenerate only the specs whose baselines the task changes, with `VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/<spec>.spec.ts`; then `git status --short e2e-visual/__baselines__` lists what moved, and the implementer opens every listed PNG with the Read tool and looks at it before committing. A PNG that moved outside the task's "Baselines" list is a bug in the task (or the list is wrong): stop and say which in the report. A listed PNG that did not move is fine; say so. Each task ends with a full `VISUAL_PORT=5195 pnpm visual` (every scene, the stories, the README path) green.
- axe stays green: every visual scene runs `expectNoAxeViolations` (`e2e-visual/axe.ts`) right after its `toHaveScreenshot`. A task never disables a rule to make a scene pass.
- Every spec a task breaks is fixed in that task: a locator that names a renamed control is updated in `e2e-visual/workspace-steps.ts` or the spec, never loosened. `readme-path.spec.ts` stays green after every task; Task 15 rewrites the README and its spec together.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`, a Wednesday), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`), which is **07:00 ET**. Never read the live clock in `src/mocks` (banned by test). The presenter's jumps move the session clock to Thu 26 Feb and Mon 2 Mar. "Today" in the engine is the New York day of `sessionNow()`, read with `easternDayOf` (Task 1), never `MOCK_TODAY_ISO`.
- Times are shown in ET through `fmtEasternStamp`/`fmtEasternTime` ("25 Feb 07:00 ET"; "07:00 ET" in a same-day context). Dates use `fmtDayMonthYear` ("27 Mar 2026"); client letters keep `clientDate`. UTC appears only in a record slip's Audit details. US spelling in all copy, identifiers and comments.
- Agent claims contain no hand-typed digits. Every figure travels as a `Figure` formatted by the kit; a claim may carry the kit-formatted text (`figureText`, `src/kit/figure-text.ts`) of one of its own figures; any other digit fails `handTypedDigits` (`src/test/claim-digits.ts`). Engine words that reach the UI (queue reasons, holding orders) travel as data and are worded and formatted in the UI by the kit.
- Never use a real person's name. Demo people: Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002`, Mike Chen `user-003`, Mark Davis `cco-001`, Robert Johnson `cli-001`, Patricia Johnson `cli-002`, Dr. Amanda Pell `prsp-011`. Only Adrian acts live; everyone else is seeded or shown through View as.
- Larkfield Advisory is a fictional SEC-registered investment adviser (an RIA). Never Reg BI; disclosure timing is labeled firm policy; tax amounts are estimates and the reader is told to check with their tax professional.
- Production UI never imports values from `src/mocks` (`import type` is allowed); `src/__tests__/guardrails/mocks-boundary.test.ts` stays green. A constant both sides need lives in `src/lib`.
- There is one external-party boundary. An outsider (client or prospect) sees only their own thread and is never served firm-only data (no fingerprint, record id, UTC stamp, agent, colleague's provenance, `deliveries`, `copies`). Every new route passes the outsider route guard `src/mocks/handlers/__tests__/outsider-routes.test.ts` (a firm-only route answers outsiders 404), and `src/mocks/workspace/__tests__/external-boundary.test.ts` stays green.
- Phase 9 vocabulary only: **Just me · Larkfield team · Client conversations**, **Share to**, **Details**, **Related records**, **Audit trail**, **Firm / Reports**, **Can / Can't**. Accounts read "<Owner> · <Type> (…<last 4>)" through `accountDisplayName` (`src/lib/account-display.ts`) wherever people read them; claims and thread titles keep the digit-free `account.name`. `src/__tests__/guardrails/retired-words.test.ts` stays green, and Task 12 adds "stage trades" to it.
- Suitability is judged per client, against that client's questionnaire, on "<client>'s accounts as a whole" (`clientRiskOf`, `src/mocks/reference/risk.ts`). Nothing pools risk across a household. Each proposal version's "after" figure comes from its own legs (and, from Task 3, the working orders it counts), never from another version's.
- Every in-app path literal matches a route (`route-links.test.ts`); every service request has a handler and every handler a caller (`api-routes.test.ts`).
- Commit messages end with the trailer naming the model that wrote the commit: implementers `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; the controller `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Preview deploy (Task 15, controller only, after the user approves): `pnpm build && pnpm exec wrangler versions upload --preview-alias workspace --tag phase-10 --message "workspace phase 10: household first"`. No production deploy in this phase.

## Review Focus

1. **A household with nothing due.** Most of the 13 households need nothing today. Such a household must not appear in the queue, must still appear in the A–Z list, and its row must show its name and value with no empty status line, no stray "·" and no markers. Tests: Task 7, `household-book.test.ts` "a household with nothing due is in the A–Z list and not in the queue, with no reasons"; Task 8, `book-column.test.tsx` "a household with nothing due shows no status line and no markers".
2. **View as switches with a mode remembered.** Adrian switches to Conversations, then views as Sarah Mitchell: Sarah must see her own remembered mode (Households by default), not Adrian's; back as Adrian, Conversations is still his. With storage blocked the column opens on Households and nothing throws. Tests: Task 8, `book-mode.test.ts` "each viewer keeps their own mode" and "blocked storage opens on Households and keeps nothing, without throwing"; `book-column.test.tsx` "switches to Conversations, remembered for this viewer only".
3. **Foreign-currency and custom-mandate households.** Chen-Wong holds HKD and SGD accounts; Patel holds a custom digital-asset mandate. Household totals must be in USD, the asset-class rows must tie to the managed total, and a custom mandate must be listed as outside the target rather than crash the target arithmetic. Tests: Task 9, `household-holdings.test.ts` "Chen-Wong's classes tie to its value in USD" and "Patel's custom mandate is outside the target, listed by name".
4. **Patricia writes back.** A client who replies in her own thread becomes a client waiting, named, in the queue and on the household page; the next firm message in her thread (the recap's second delivery) answers her. Test: Task 7, `household-book.test.ts` "Patricia waiting after she writes; answered by the recap's delivery to her thread".
5. **Starting a client conversation that already exists.** From the Johnson page, "Client conversation with Robert" must open Robert's existing conversation, not make a second client thread he would then see. Test: Task 11, `conversations.test.ts` "a client conversation with a member who has one opens it; none is created".

---

## Spec decisions this plan makes explicit

- **The household risk line, under the per-client ruling.** The spec's header line "the client's tolerance, and the household risk figure with its status from Phase 9" is read under the Phase 9 amendment as it now stands in code: suitability is per client. The header shows no pooled household figure. It shows one line per member, each a client in their own right: "<Name> · <Band> tolerance (<floor>–<ceiling> pts) · accounts as a whole <score> pts · <WITHIN|ABOVE|BELOW> TOLERANCE", the figures from `clientRiskOf` and `bandFor`, the tag from `TOLERANCE_TAG`. A member with no measured account shows the tolerance and "no measured account". (Tasks 9, 10.)
- **Patricia's figure is the engine's, not a typed 49.** The brief for this plan says Patricia sits at 49 against her 26–40 band. At `55ab98b` the engine reads Patricia's accounts as a whole at 34, within Moderate Conservative 26–40 (Roth 36, Individual 33; Robert 51, within Moderate 41–55). The plan never types either number into copy: the page, the notes and the story guard read `clientRiskOf('cli-002')`. Tests pin the engine's current reading (34, within) as a fixture fact with a message that says to report, not to edit, if it differs. Meeting Notes' Patricia line follows the same figure (Task 4).
- **Which seeds are corrected.** The sweep finds four disagreements, not two: UST-10Y `ord-014` (acc-002), VFIAX `ord-013` (acc-001), VNQ `ord-012` (acc-015) fill with no holding, and the SMH `pos-265` lot has no order. Adding positions would move the Johnson Trust's and Robert Individual's weights, and with them every figure the reviewer tied by hand. So the three orphaned tickets are corrected to what the holdings show (canceled unfilled the day they were entered), and SMH gets its ticket `ord-017`, filled at 10:20 ET on 20 Feb, five minutes after the INTC sale, as the activity feed already states. The par, fund and option valuation formulas keep their coverage through unit tests on `ticketValue` (Task 1). (Task 2.)
- **What "counts toward the proposal" means.** A working OMS ticket, and an order of another proposal waiting for compliance release, is treated as filled when the proposal is drafted: the drift the legs are sized from, the cash the buys may draw, the pre-trade check's starting holdings and cash, the drift after, and the risk "after" all include it. A proposal's own pending orders are its legs, never working orders. The version records the orders it counted, the proposal shows them in one line, the Proposal Agent's summary names them, and the Pre-trade Check warns when a leg trades a symbol a working order already trades. This moves the story's figures; Task 3 states the old and new values. (Task 3.)
- **"Today's fills" are the session day's.** The ledger's fills are those on a given New York day, default the session clock's. Meeting Notes reads the meeting's own day, so notes drafted after a clock jump still know what filled on the meeting day. (Tasks 1, 4.)
- **The rebalance line in the notes has three states.** Fills from a proposal on the meeting day: "this morning's rebalance". An approved version's orders pending compliance release: "approved and awaiting compliance release". Neither: "nothing has been approved or traded yet". The transcript stays as spoken. (Task 4.)
- **The Harvest Scanner does not offer what was bought today.** A position the firm bought today is not offered for harvest; the scanner says, in Context, that it was bought today. This closes the reviewer's "the Brief recommends selling what we bought three minutes earlier". (Task 5.)
- **"Every agent reads it" is enforced by a guard.** The named readers (Meeting Prep, Meeting Notes' wiring, Drift Monitor, Harvest Scanner, the Proposal Agent's engine, Pre-trade Check, the Client Letter agent, the Brief's Today) import the ledger and never read its raw parts (`ledgerFills`, `recordedSales`, `bookOf`, the OMS `orders`, `store().staged`). (Task 5.)
- **The recap reaches Patricia as one act with two deliveries.** Patricia gets her own client thread `th-patricia` (`cli-002`, members Patricia, Adrian and Sarah). A recap drafted in Robert's thread records a copy for each attending member who has her own thread; sending it is one `send_to_party` act whose `deliveries` name both messages. Each delivery is its own item for compliance review. The button reads "Send to Robert and Patricia". View as gains "Patricia Johnson · Client". (Task 6.)
- **The column's name.** For firm viewers the left column, its phone tab and its jump key are named **Book**, since in Households mode it holds no threads. For clients and prospects nothing changes: the column, tab and key stay **Threads**. (Task 8.)
- **Where the Brief sits in each mode.** In Conversations the Brief stays in Just me. In Households a "Your day" pane above the queue holds one link, Brief. Home links to it as before. (Task 8.)
- **The queue's words.** The engine serves reasons as data; the UI words them: "Decision waiting", "Robert waiting 4 min" (`fmtWaited`), "review 14:00 ET", "1 compliance item", "Task overdue". A meeting today is one still scheduled; a held or filed meeting has no reason left. "Ordered by age" is the oldest `since` first; for meetings, the earliest start; for tasks, the earliest due. (Tasks 7, 8.)
- **Household target and band.** The target is the value-weighted model targets of the model-managed accounts, in USD; the band is the same weighting of their models' drift tolerances; drift and status are against those. A custom mandate is listed under the table as outside the target. Held-away accounts appear inside an expanded row, marked "outside the firm's view", and are not in the totals. All stated in Methods. (Task 9.)
- **Open orders on the holding they change.** A working ticket reads "working: buy 200 QQQ, limit 480.00"; a proposal's order "pending compliance release: sell 943 SPY"; a fill "filled 09:30 ET: sold 7,000 INTC". (Tasks 9, 10.)
- **Owners for open items.** A compliance alert is owned by compliance (Mark Davis), with no due date; a household open item with no named owner is owned by the advisor of record, Adrian Hale; a document awaiting signature is owned by the client who signs it. (Task 9.)
- **A new conversation.** From the household page: Just me or Larkfield team makes a new thread about the household; "Client conversation with <member>" opens that member's existing conversation, or makes one if they have none, since a client has one conversation with the firm. (Task 11.)
- **"Largest clients".** A client here is a household relationship, as the Practice table already counts them. The two readings are the top three and top five households' shares of annual revenue, from the same billing figures as the table. (Task 13.)

## Coverage

| Spec section | Requirement | Task |
|---|---|---|
| §1 Shell | Two modes, segmented control with `aria-pressed`, keyboard, Households first | 8 |
| §1 Shell | Household rows: name, managed value, one status line, text markers | 7 (data), 8 (row) |
| §1 Shell | Mode remembered per viewer in localStorage | 8 |
| §1 Shell | Outsiders get no switch | 8 |
| §1 Shell | Phone: the list tab becomes the two-mode column | 8 |
| §1 Shell | Brief reachable from both modes and home; home path starts from Households | 8, 15 |
| §2 Queue | Five tiers, waiting time, ties by age, empty queue, A–Z, firm only, live | 7 |
| §2 Queue | Each entry's reason in one line with kit figures, opens the household | 8 |
| §2 Queue | After the release the Johnsons' decision drops off and the meeting remains | 7 |
| §3 Page | Header: name, members, managed and held-away, each member's tolerance and accounts-as-a-whole | 9, 10 |
| §3 Page | Holdings by asset class against target, drift, status; expand to accounts; held away marked | 9, 10 |
| §3 Page | Open orders and today's fills on the holding they change | 9, 10 |
| §3 Page | Target stated in Methods | 9, 10 |
| §3 Page | Needs a decision, tasks and open items, meetings, last client contact, client waiting | 9, 10 |
| §3 Page | Conversations in the right column with visibility words; start one | 11 |
| §3 Page | Firm only; outsiders "not found" | 9, 10 |
| §4 Ledger | `householdLedger(householdId)`: positions and lots, held away, open orders, today's fills, realized sales and windows, cash; reads through the session ledger | 1 |
| §4 Agents | Every agent and the Brief read it | 4, 5 (guard), 3 (Proposal Agent, Pre-trade) |
| §4 Fixes | Blotter and holdings agree; a sweep over every account | 2 |
| §4 Fixes | Rebalancer counts working orders; Pre-trade warns on overlap | 3 |
| §4 Fixes | Notes check what filled; plan wording before the release | 4 |
| §4 Fixes | Recap to both spouses, one act, two deliveries; View as Patricia; her decisions reach her | 6 |
| §4 Fixes | Notes agree with Risk on Patricia's accounts | 4 |
| §4 Guard | Story replay: every claim and letter line agrees with the ledger when made | 14 |
| §5 | Unanswered client messages in the queue and on the page | 7, 9 |
| §5 | Agents page, reachable from the command line and Firm; thread headers keep their agents | 12 |
| §5 | Practice: largest clients' share of revenue, top 3 and top 5 | 13 |
| Testing | Visual baselines listed in the spec | 6, 8, 10, 12, 15 |
| README | Path starts from Households; the spec follows it | 15 |
| Parked item | Agent scopes rewritten without "stage"; "stage trades" retired | 12 |

## Task order and shared files

| Task | Depends on | Shares files with |
|---|---|---|
| 1 Household ledger | — | new `src/lib/eastern-day.ts`, new `src/mocks/workspace/household-ledger.ts`, `src/mocks/reference/blotter.ts` |
| 2 Blotter and holdings agree | 1 | `src/mocks/handlers/oms.ts` (seed orders), `src/mocks/data/activities.ts`, blotter tests |
| 3 Working orders in the rebalancer | 1, 2 | `oms.ts`, `compliance.ts`, `services/oms.ts`, `suitability.ts`, `proposal-engine.ts`, `proposals.ts`, `proposal-agent.ts`, `pretrade-check.ts`, `types/workspace-proposal.ts`, `ProposalEmbed.tsx` |
| 4 Notes that check fills | 1, 3 | `meeting-notes.ts`, `meeting-agents.ts`, `meeting-prep.ts` |
| 5 Every agent reads the ledger | 1, 3, 4 | `harvest-scanner.ts`, `drift-monitor.ts`, `client-letter.ts`, `brief-topic.ts`, `brief-groups.ts`, `brief-today.ts`, `meeting-prep.ts` |
| 6 Patricia's thread and the two-delivery recap | 4 | `people.ts`, `workspace-seed.ts`, `types/workspace.ts`, `recap.ts`, `acts.ts`, `letters.ts`, `outsider-view.ts`, `correspondence.ts`, `handlers/workspace.ts`, `workspace-http.ts`, `DraftsPanel.tsx`, outsider tests, `meeting-review.spec.ts`, `readme-path.spec.ts` |
| 7 Household queue (engine) | 1, 6 | new `types/workspace-book.ts`, new `household-book.ts` |
| 8 Shell modes | 7 | `kit/measure.ts`, new `kit/segmented/*`, `workspace-meetings.ts` (the book's route), `services/workspace.ts`, `hooks/use-workspace.ts`, `WorkspaceShell.tsx`, `ThreadList.tsx`, `ThreadListSkeleton.tsx`, `phone-panes.ts`, new `BookColumn.tsx`, `HouseholdsColumn.tsx`, `DeskLinks.tsx`, `KitSections.tsx`, every e2e spec (locators) |
| 9 Household page engine | 1, 6, 7 | `types/workspace-household.ts`, `household-views.ts` |
| 10 Household page UI | 9 | `HouseholdView.tsx`, new `src/workspace/household/*`, `routes.tsx`, new `e2e-visual/household.spec.ts`, `meeting-review.spec.ts` |
| 11 Conversations column and starting one | 10 | new `conversations.ts`, `handlers/workspace.ts`, `services/workspace.ts`, `hooks/use-workspace.ts`, `routes.tsx`, new `HouseholdConversations.tsx` |
| 12 Agents page | 8 | `people.ts` (scopes), `ThreadList.tsx`, new `AgentsPage.tsx`, `routes.tsx`, `DeskLinks.tsx`, `use-destinations.ts`, `retired-words.ts` |
| 13 Practice | — | `practice.ts`, `types/reference-practice.ts`, `PracticePage.tsx` |
| 14 Story-replay guard | 1–6 | new `src/mocks/__tests__/ledger-claims.ts`, new `story-replay.test.ts` |
| 15 README, home path, every check | all | `README.md`, `home-steps.ts`, `readme-path.spec.ts`, `workspace-steps.ts` |

One serial checkout. Tasks 3–6 each touch agents or engine files the next one also touches; 8, 10, 11 and 12 all touch the shell, the routes and nearly every shared baseline. No two tasks run in parallel.

## Baselines by task

60 baselines exist at `55ab98b` (`e2e-visual/__baselines__/`). "List scenes" show the left column: `home-*`, `home-mid-story-light`, `key-sheet-light`, `command-line-1440x600-light`, `adrian-johnson-finding-*`, `adrian-robert-thread-light`, `robert-thread-*`, `account-full-view-light`, `brief-*`, `proposal-thread-*`, `proposal-reset-light`, `robert-letter-*`, `archive-light`, `thread-after-release-light`, `brief-after-fills-light`, `meeting-thread-light`, `robert-recap-light`, `robert-recap-client-light`, `pell-thread-light`, `pell-thread-prospect-light`, `pell-work-light`, `pell-onboarding-light`, `phone-home-light`. "Proposal scenes" show a Johnson proposal or what follows it: `proposal-thread-*`, `proposal-reset-light`, `workbench-*`, `thread-after-release-light`, `brief-after-fills-light`, `supervision-*`, `archive-light`, `robert-letter-*`, `meeting-thread-light`, `meeting-before-*`, `meeting-after-*`, `robert-recap-light`, `phone-context-light`.

| Task | Changes | Must not change | New | Removed |
|---|---|---|---|---|
| 1 | none | all | — | — |
| 2 | `blotter-light` | every other | — | — |
| 3 | proposal scenes | `home-*`, `kit-*`, reference views except `blotter-light` (only if its proposal rows are in the scene; they are not) | — | — |
| 4 | `meeting-after-*` | every other | — | — |
| 5 | `brief-after-fills-light` (AGG leaves Needs a decision; "bought today" in Context) | every other | — | — |
| 6 | list scenes for Adrian (Patricia's row under Client conversations), `robert-recap-light` (the button) | `robert-thread-*`, `robert-recap-client-light`, `pell-thread-prospect-light`, `kit-*`, reference views | `patricia-recap-client-light` | — |
| 7 | none | all | — | — |
| 8 | every list scene (the column becomes the Book in Households mode), `kit-*` (the segmented control) | `not-found-light`, full-width reference views, `supervision-*`, `workbench-*`, `meeting-before-*`, `meeting-after-*`, `prospect-page-*` | `households-light`, `households-dark`, `phone-households-light` | — |
| 9 | none | all | — | — |
| 10 | `client-light` only if the client view's link to its household moves (it should not) | every other | `household-johnson-before-light`, `household-johnson-before-dark`, `household-johnson-after-light`, `household-johnson-after-dark`, `household-class-expanded-light` | `household-light` |
| 11 | the five household scenes (the right column's conversations and start form) | every other | — | — |
| 12 | list scenes (Firm gains Agents; the Agents pane leaves the column), `adrian-johnson-finding-*`, `proposal-thread-*`, `thread-after-release-light`, `brief-*` (the Details column's agent scopes) | `not-found-light`, reference views | `agents-light` | — |
| 13 | `practice-light` | every other | — | — |
| 14 | none | all | — | — |
| 15 | `home-light`, `home-dark`, `home-mid-story-light`, `phone-home-light` (step 1) | every other | — | — |

At the end: 60 − 1 + 1 + 3 + 5 + 1 = 69 baselines.

---
### Task 1: The household ledger (spec §4 "The ledger")

One read model in the engine. It holds, per household, each account's positions and lots, the held-away accounts, the open orders (working OMS tickets and a proposal's orders pending compliance release), the fills on a day (OMS tickets and released proposal orders), realized sales and their wash-sale windows, and cash. It reads through the session portfolio ledger (`getPositionsForAccount`, `generateTaxLots`, `ledgerFills`, `allRealizedSales`), the OMS tickets and the staged orders; it stores nothing. The blotter's ticket readers move here so the blotter and the ledger read a ticket the same way.

**Files:**
- Create: `src/lib/eastern-day.ts`, `src/lib/__tests__/eastern-day.test.ts`
- Create: `src/mocks/workspace/household-ledger.ts`, `src/mocks/workspace/__tests__/household-ledger.test.ts`
- Modify: `src/mocks/reference/blotter.ts` (import `ticketSide`, `ticketQuantity`, `ticketValue`; delete its own `BUY_SIDES`, `SELL_SIDES`, `sideOf`, `quantityOf`, `ticketValue`)

**Interfaces:**
- Consumes: `getPositionsForAccount`, `seedPositionsForAccount`, `cashBalanceOf` (`src/mocks/data/positions.ts`); `generateTaxLots`, `CustodianLot` (`src/mocks/handlers/custodian.ts`); `ledgerFills` (`src/mocks/data/portfolio-ledger.ts`); `allRealizedSales`, `openWashSaleWindows`, `RealizedSale`, `OpenWashSaleWindow` (`src/mocks/data/realized-sales.ts`); `orders`, `currencyForAccount` (`src/mocks/handlers/oms.ts`); `usdQuoteFor` (`src/mocks/handlers/pms.ts`); `sessionNow`, `store` (`src/mocks/data/workspace-store.ts`); `convertToBase` (`src/lib/currency.ts`).
- Produces:
  - `easternDayOf(iso: string): string` in `src/lib/eastern-day.ts`.
  - In `src/mocks/workspace/household-ledger.ts` (its types module-private in this task; Task 9 exports `AccountLedger` and `HouseholdLedger`): `type QuantityUnit = 'sh' | 'contracts' | 'par'`; `type LedgerSource = { kind: 'ticket'; orderId: string } | { kind: 'proposal'; stagedOrderId: string; proposalId: string; version: number }`; `type OpenOrder = { id; accountId; symbol; assetClass: AssetClass; side: 'buy' | 'sell'; quantity: number; quantityUnit: QuantityUnit; status: 'working' | 'pending_compliance'; estimatedValue: number; limitPrice?: number; enteredAt: string; source: LedgerSource }`; `type LedgerFill = { id; accountId; symbol; assetClass; side; quantity; quantityUnit; price: number; value: number; at: string; source: LedgerSource }`; `type AccountLedger = { account: Account; positions: Position[]; lots: CustodianLot[]; cash: number; openOrders: OpenOrder[]; fillsOnDay: LedgerFill[] }`; `type HouseholdLedger = { householdId: string; asOf: string; day: string; accounts: AccountLedger[]; heldAway: HeldAwayAsset[]; openOrders: OpenOrder[]; fillsOnDay: LedgerFill[]; realizedSales: RealizedSale[]; washWindows: OpenWashSaleWindow[]; cashUsd: number }`; `ticketSide(order: Order): 'buy' | 'sell'`; `ticketQuantity(order: Order): { quantity: number; quantityUnit: QuantityUnit }`; `ticketValue(order: Order): number | undefined`; `accountLedger(accountId: string, day?: string): AccountLedger`; `householdLedger(householdId: string, day?: string): HouseholdLedger`. `day` defaults to `easternDayOf(sessionNow())`.

- [ ] **Step 1: The New York day, failing test**

Create `src/lib/__tests__/eastern-day.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { easternDayOf } from '@/lib/eastern-day'

describe('easternDayOf', () => {
  it('reads the day in New York, not in UTC', () => {
    expect(easternDayOf('2026-02-25T12:00:00Z')).toBe('2026-02-25')
    expect(easternDayOf('2026-02-26T03:00:00Z')).toBe('2026-02-25')
    expect(easternDayOf('2026-03-09T04:30:00Z')).toBe('2026-03-09')
  })
  it('refuses what is not an instant', () => {
    expect(() => easternDayOf('not a date')).toThrow('Not an ISO instant: not a date')
  })
})
```

Run: `pnpm vitest run src/lib/__tests__/eastern-day.test.ts --testTimeout 30000`
Expected: FAIL with "Failed to resolve import '@/lib/eastern-day'".

- [ ] **Step 2: The New York day**

Create `src/lib/eastern-day.ts`:

```ts
const easternDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })

/** The New York calendar day of an instant ("2026-02-25"): the day the market and the advisor are in. */
export function easternDayOf(iso: string): string {
  const instant = Date.parse(iso)
  if (Number.isNaN(instant)) throw new Error(`Not an ISO instant: ${iso}`)
  return easternDate.format(new Date(instant))
}
```

Run: `pnpm vitest run src/lib/__tests__/eastern-day.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 3: The ledger, failing test**

Create `src/mocks/workspace/__tests__/household-ledger.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { advanceClockTo } from '@/mocks/data/workspace-store'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { minuteOf } from '@/lib/clock'
import { accountLedger, householdLedger, ticketValue } from '../household-ledger'
import { approvedV1, release } from './story-fixture'

const johnson = () => householdLedger('hh-001')
const account = (id: string) => {
  const found = johnson().accounts.find((a) => a.account.id === id)
  if (!found) throw new Error(`no ${id} in the Johnson ledger`)
  return found
}

describe('the household ledger', () => {
  it("holds the Johnsons' five accounts and their two held-away plans", () => {
    expect(johnson().accounts.map((a) => a.account.id)).toEqual(['acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005'])
    expect(johnson().heldAway.map((h) => h.id)).toEqual(['ha-001', 'ha-002'])
  })

  it('holds every position with the lots that make it up; SMH is the one lot bought on 20 Feb', () => {
    for (const a of johnson().accounts) {
      for (const p of a.positions.filter((x) => x.symbol !== 'CASH')) {
        const shares = a.lots.filter((l) => l.positionId === p.id).reduce((s, l) => s + l.quantity, 0)
        expect(shares, `${a.account.id} ${p.symbol}`).toBeCloseTo(p.quantity, 6)
      }
    }
    const robert = account('acc-002')
    const smh = robert.positions.find((p) => p.symbol === 'SMH')
    if (!smh) throw new Error('acc-002 holds SMH')
    expect(robert.lots.filter((l) => l.positionId === smh.id).map((l) => [l.purchaseDate, l.quantity])).toEqual([['2026-02-20', 180]])
  })

  it('names the working tickets, valued at their limits, with the asset class each changes', () => {
    expect(johnson().openOrders.map((o) => [o.id, o.accountId, o.side, o.symbol, o.quantity, o.status, o.assetClass, o.estimatedValue, o.limitPrice])).toEqual([
      ['ord-003', 'acc-001', 'sell', 'NVDA', 25, 'working', 'us_equity', 19_625, 785],
      ['ord-005', 'acc-002', 'buy', 'QQQ', 200, 'working', 'us_equity', 96_000, 480],
    ])
  })

  it('has no fills today before the release: the tickets filled on earlier days', () => {
    expect(johnson().day).toBe('2026-02-25')
    expect(johnson().fillsOnDay).toEqual([])
  })

  it("states the household's realized sales and the taxpayer's open windows", () => {
    expect(johnson().realizedSales.map((s) => s.id)).toEqual(['rs-001'])
    expect(johnson().washWindows.map((w) => [w.symbol, w.end])).toEqual([['INTC', '2026-03-22']])
  })

  it("sums every account's cash, in USD", () => {
    const l = johnson()
    expect(l.cashUsd).toBeCloseTo(l.accounts.reduce((s, a) => s + a.cash, 0), 2)
    expect(account('acc-002').cash).toBe(225_504)
  })

  it("counts an approved version's orders as pending compliance release, then its fills as today's", () => {
    const a = approvedV1()
    const pending = johnson().openOrders.filter((o) => o.status === 'pending_compliance')
    expect(pending.length).toBeGreaterThan(0)
    for (const o of pending) expect(o.source).toMatchObject({ kind: 'proposal', proposalId: a.proposalId, version: 1 })
    release(a)
    expect(johnson().openOrders.filter((o) => o.status === 'pending_compliance')).toEqual([])
    expect(johnson().fillsOnDay.map((f) => f.id)).toEqual(ledgerFills().map((f) => f.id))
    expect(account('acc-002').positions.some((p) => p.symbol === 'INTC')).toBe(false)
  })

  it("reads the session clock's day: after a jump to Thursday, Wednesday's fills are not the day's", () => {
    release(approvedV1())
    advanceClockTo(minuteOf('2026-02-26T14:10:00Z'))
    expect(johnson().day).toBe('2026-02-26')
    expect(johnson().fillsOnDay).toEqual([])
    expect(householdLedger('hh-001', '2026-02-25').fillsOnDay.length).toBe(ledgerFills().length)
  })

  it('refuses an account or a household it does not know', () => {
    expect(() => accountLedger('acc-999')).toThrow('No account acc-999')
    expect(() => householdLedger('hh-999')).toThrow('No household hh-999')
  })
})

describe('ticketValue', () => {
  const filled = { id: 'ord-x', accountId: 'acc-001', side: 'buy', orderType: 'market', status: 'filled', submittedAt: '2026-02-24T15:00:00Z', filledAt: '2026-02-24T21:00:00Z' } as const
  it('values a filled ticket by what it is: a fund by its shares, a bond on par, an option by its multiplier', () => {
    expect(ticketValue({ ...filled, symbol: 'VFIAX', quantity: 53.72647, filledQuantity: 53.72647, filledPrice: 465.32, assetClass: 'mutual_fund' })).toBeCloseTo(25_000, 2)
    expect(ticketValue({ ...filled, symbol: 'UST-10Y', quantity: 50, filledQuantity: 50, filledPrice: 95.2, assetClass: 'fixed_income', parAmount: 50_000 })).toBeCloseTo(47_600, 6)
    expect(ticketValue({ ...filled, symbol: 'AAPLC185', side: 'buy_to_open', quantity: 5, filledQuantity: 5, filledPrice: 8.5, assetClass: 'option', contractMultiplier: 100 })).toBeCloseTo(4_250, 6)
  })
  it('has no value for a ticket that did not fill', () => {
    expect(ticketValue({ ...filled, status: 'canceled', symbol: 'VNQ', quantity: 200, filledQuantity: 0, assetClass: 'equity' })).toBeUndefined()
  })
})
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-ledger.test.ts --testTimeout 30000`
Expected: FAIL with "Failed to resolve import '../household-ledger'".

- [ ] **Step 4: The ledger**

Create `src/mocks/workspace/household-ledger.ts`:

```ts
import type { Account } from '@/types/account'
import type { AssetClass, Position } from '@/types/portfolio'
import type { HeldAwayAsset } from '@/types/held-away'
import type { Order } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { cashBalanceOf, getPositionsForAccount, seedPositionsForAccount } from '@/mocks/data/positions'
import { allRealizedSales, openWashSaleWindows, type OpenWashSaleWindow, type RealizedSale } from '@/mocks/data/realized-sales'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import { generateTaxLots, type CustodianLot } from '@/mocks/handlers/custodian'
import { currencyForAccount, orders } from '@/mocks/handlers/oms'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { convertToBase } from '@/lib/currency'
import { easternDayOf } from '@/lib/eastern-day'

/**
 * The one household ledger every agent, letter and screen reads: positions and lots per account, held-away
 * accounts, open orders, the day's fills, realized sales and their wash-sale windows, and cash. A view over the
 * session portfolio ledger, the OMS tickets and the staged proposal orders; it stores nothing.
 */

type QuantityUnit = 'sh' | 'contracts' | 'par'
/** Where an order or a fill comes from: an OMS ticket, or an order staged from an approved proposal version. */
type LedgerSource = { kind: 'ticket'; orderId: string } | { kind: 'proposal'; stagedOrderId: string; proposalId: string; version: number }

/**
 * An order not yet filled: a working OMS ticket, or a proposal's order waiting for compliance to release it.
 * `estimatedValue` is what it would move between the holding and cash, in the account's currency: a limit order at
 * its limit, a market order at the holding's price or the quote, a proposal's order at its estimate.
 */
type OpenOrder = {
  id: string; accountId: string; symbol: string; assetClass: AssetClass; side: 'buy' | 'sell'
  quantity: number; quantityUnit: QuantityUnit; status: 'working' | 'pending_compliance'
  estimatedValue: number; limitPrice?: number; enteredAt: string; source: LedgerSource
}
type LedgerFill = {
  id: string; accountId: string; symbol: string; assetClass: AssetClass; side: 'buy' | 'sell'
  quantity: number; quantityUnit: QuantityUnit; price: number; value: number; at: string; source: LedgerSource
}
/** One account as the ledger reads it on `day`: `fillsOnDay` are that New York day's fills. */
type AccountLedger = { account: Account; positions: Position[]; lots: CustodianLot[]; cash: number; openOrders: OpenOrder[]; fillsOnDay: LedgerFill[] }
type HouseholdLedger = {
  householdId: string
  /** The session clock when it was read. */
  asOf: string
  /** The New York day `fillsOnDay` and `washWindows` are read for. */
  day: string
  accounts: AccountLedger[]
  heldAway: HeldAwayAsset[]
  openOrders: OpenOrder[]
  fillsOnDay: LedgerFill[]
  realizedSales: RealizedSale[]
  washWindows: OpenWashSaleWindow[]
  /** Every account's cash, converted to USD. */
  cashUsd: number
}

const BUY_SIDES: ReadonlySet<string> = new Set(['buy', 'purchase', 'buy_to_open', 'buy_to_close', 'buy_to_cover'])
const SELL_SIDES: ReadonlySet<string> = new Set(['sell', 'redemption', 'sell_short', 'sell_to_open', 'sell_to_close'])
const WORKING: ReadonlySet<Order['status']> = new Set(['pending', 'submitted'])

export function ticketSide(order: Order): 'buy' | 'sell' {
  if (BUY_SIDES.has(order.side)) return 'buy'
  if (SELL_SIDES.has(order.side)) return 'sell'
  throw new Error(`Ticket ${order.id} has a side the ledger cannot read: ${order.side}`)
}

/** An option ticket counts contracts and a bond ticket states par; everything else is shares. */
export function ticketQuantity(order: Order): { quantity: number; quantityUnit: QuantityUnit } {
  if (order.assetClass === 'option') return { quantity: order.quantity, quantityUnit: 'contracts' }
  if (order.assetClass === 'fixed_income') {
    if (order.parAmount === undefined) throw new Error(`Bond ticket ${order.id} names no par amount`)
    return { quantity: order.parAmount, quantityUnit: 'par' }
  }
  return { quantity: order.quantity, quantityUnit: 'sh' }
}

/** A price times what it buys: a bond's is par × price ÷ 100; an option's is contracts × price × its multiplier. */
function valueAt(order: Order, price: number, quantity: number): number {
  if (order.assetClass === 'fixed_income') {
    if (order.parAmount === undefined) throw new Error(`Bond ticket ${order.id} names no par amount`)
    return (order.parAmount * price) / 100
  }
  if (order.assetClass === 'option') {
    if (order.contractMultiplier === undefined) throw new Error(`Option ticket ${order.id} names no multiplier`)
    return quantity * price * order.contractMultiplier
  }
  return quantity * price
}

/** A filled ticket's value at its fill price; none for a ticket that did not fill. */
export function ticketValue(order: Order): number | undefined {
  if (order.status !== 'filled' || order.filledPrice === undefined) return undefined
  return valueAt(order, order.filledPrice, order.filledQuantity)
}

function accountOf(accountId: string): Account {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error(`No account ${accountId}`)
  return account
}

/** The class a symbol belongs to in this account: as held, as the fixtures held it, as quoted, or (an option) its underlying's. */
function assetClassIn(account: Account, symbol: string, positions: readonly Position[], underlying?: string): AssetClass {
  const of = (s: string) => positions.find((p) => p.symbol === s)?.assetClass
    ?? seedPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === s)?.assetClass
    ?? usdQuoteFor(s)?.assetClass
  const found = of(symbol) ?? (underlying === undefined ? undefined : of(underlying))
  if (!found) throw new Error(`The ledger has no asset class for ${symbol} in ${account.id}`)
  return found
}

function workingValue(order: Order, positions: readonly Position[]): number {
  const price = order.limitPrice ?? positions.find((p) => p.symbol === order.symbol)?.price ?? usdQuoteFor(order.symbol)?.price
  if (price === undefined) throw new Error(`Working ticket ${order.id} has no limit and no quote for ${order.symbol}`)
  return valueAt(order, price, order.quantity)
}

function openOrdersOf(account: Account, positions: readonly Position[]): OpenOrder[] {
  const tickets = orders.filter((o) => o.accountId === account.id && WORKING.has(o.status)).map((o): OpenOrder => ({
    id: o.id, accountId: o.accountId, symbol: o.symbol, assetClass: assetClassIn(account, o.symbol, positions, o.underlying),
    side: ticketSide(o), ...ticketQuantity(o), status: 'working', estimatedValue: workingValue(o, positions),
    ...(o.limitPrice !== undefined ? { limitPrice: o.limitPrice } : {}), enteredAt: o.submittedAt, source: { kind: 'ticket', orderId: o.id },
  }))
  const staged = store().staged.filter((o) => o.accountId === account.id && o.status === 'pending_compliance').map((o): OpenOrder => ({
    id: o.id, accountId: o.accountId, symbol: o.symbol, assetClass: assetClassIn(account, o.symbol, positions),
    side: o.side, quantity: o.quantity, quantityUnit: 'sh', status: 'pending_compliance', estimatedValue: o.estimatedValue,
    enteredAt: o.stagedAt, source: { kind: 'proposal', stagedOrderId: o.id, proposalId: o.proposalId, version: o.version },
  }))
  return [...tickets, ...staged].sort((a, b) => a.enteredAt.localeCompare(b.enteredAt) || a.id.localeCompare(b.id))
}

function fillsOn(account: Account, positions: readonly Position[], day: string): LedgerFill[] {
  const tickets = orders.filter((o) => o.accountId === account.id && o.status === 'filled' && o.filledAt !== undefined && easternDayOf(o.filledAt) === day).map((o): LedgerFill => {
    const value = ticketValue(o)
    if (value === undefined || o.filledPrice === undefined || o.filledAt === undefined) throw new Error(`Filled ticket ${o.id} states no fill`)
    return {
      id: o.id, accountId: o.accountId, symbol: o.symbol, assetClass: assetClassIn(account, o.symbol, positions, o.underlying), side: ticketSide(o), ...ticketQuantity(o),
      price: o.filledPrice, value, at: o.filledAt, source: { kind: 'ticket', orderId: o.id },
    }
  })
  const released = ledgerFills().filter((f) => f.accountId === account.id && easternDayOf(f.at) === day).map((f): LedgerFill => ({
    id: f.id, accountId: f.accountId, symbol: f.symbol, assetClass: assetClassIn(account, f.symbol, positions), side: f.side, quantity: f.quantity, quantityUnit: 'sh',
    price: f.price, value: f.value, at: f.at, source: { kind: 'proposal', stagedOrderId: f.stagedOrderId, proposalId: f.proposalId, version: f.version },
  }))
  return [...tickets, ...released].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
}

const sessionDay = (): string => easternDayOf(sessionNow())

export function accountLedger(accountId: string, day: string = sessionDay()): AccountLedger {
  const account = accountOf(accountId)
  const positions = getPositionsForAccount(account.id, account.totalValue)
  return {
    account, positions, lots: generateTaxLots(account.id, account.totalValue), cash: cashBalanceOf(account),
    openOrders: openOrdersOf(account, positions), fillsOnDay: fillsOn(account, positions, day),
  }
}

export function householdLedger(householdId: string, day: string = sessionDay()): HouseholdLedger {
  if (!householdFixtures.some((h) => h.id === householdId)) throw new Error(`No household ${householdId}`)
  const own = accounts.filter((a) => a.householdId === householdId).map((a) => accountLedger(a.id, day))
  return {
    householdId, asOf: sessionNow(), day, accounts: own,
    heldAway: heldAwayAssets.filter((h) => h.householdId === householdId),
    openOrders: own.flatMap((a) => a.openOrders).sort((a, b) => a.enteredAt.localeCompare(b.enteredAt) || a.id.localeCompare(b.id)),
    fillsOnDay: own.flatMap((a) => a.fillsOnDay).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)),
    realizedSales: allRealizedSales().filter((s) => s.householdId === householdId),
    washWindows: openWashSaleWindows(day, householdId),
    cashUsd: own.reduce((s, a) => s + convertToBase(a.cash, currencyForAccount(a.account.id), FX_RATES_USD_BASE), 0),
  }
}
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-ledger.test.ts --testTimeout 30000`
Expected: PASS. If the open-orders case lists more than the two tickets, a staged order exists before any approval: report it.

- [ ] **Step 5: The blotter reads tickets through the ledger**

In `src/mocks/reference/blotter.ts`:
- delete `BUY_SIDES`, `SELL_SIDES`, `sideOf`, `ticketValue` and `quantityOf`;
- add `import { ticketQuantity, ticketSide, ticketValue } from '@/mocks/workspace/household-ledger'`;
- in `ticketRow`: `side: ticketSide(order), ...ticketQuantity(order)` in place of `side: sideOf(order), ...quantityOf(order)`; `const value = ticketValue(order)` stays.

Run: `pnpm vitest run src/mocks/reference/__tests__/blotter.test.ts src/workspace/__tests__/blotter-view.test.tsx --testTimeout 30000`
Expected: PASS, unchanged.

- [ ] **Step 6: Every check, then commit**

Run the end-of-task checks (Global Constraints). Baselines: none move.

```bash
git add src/lib/eastern-day.ts src/lib/__tests__/eastern-day.test.ts src/mocks/workspace/household-ledger.ts src/mocks/workspace/__tests__/household-ledger.test.ts src/mocks/reference/blotter.ts
git commit -m "feat(engine): one household ledger, read through the session ledger, the tickets and the staged orders

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The blotter and the holdings agree (spec §4 "The blotter and holdings agree")

A sweep over every account: every filled buy shows in holdings, and every lot bought since the blotter's first day has its filled buy. It fails on four seeds at `55ab98b`; the fixes are the ruling above (three tickets canceled, SMH's ticket added).

**Files:**
- Create: `src/mocks/reference/__tests__/blotter-holdings.test.ts`
- Modify: `src/mocks/handlers/oms.ts` (`orders`: `ord-012`, `ord-013`, `ord-014`, new `ord-017`, and the comment above the array), `src/mocks/data/activities.ts` (`smhPurchaseTimestamp` reads `ord-017`), `src/mocks/reference/__tests__/blotter.test.ts`, `src/workspace/__tests__/blotter-view.test.tsx`

**Interfaces:**
- Consumes: `accountLedger` (Task 1); `blotterView` (`src/mocks/reference/blotter.ts`); `easternDayOf` (Task 1); `approvedStoryV3`, `release`, `ADRIAN` (`src/mocks/workspace/__tests__/story-fixture.ts`).
- Produces: the seed `ord-017` (SMH, acc-002, 180 sh, filled 245.20 at `2026-02-20T15:20:03Z`). Later tasks read the seeds through the ledger only.

- [ ] **Step 1: The sweep, failing**

Create `src/mocks/reference/__tests__/blotter-holdings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { easternDayOf } from '@/lib/eastern-day'
import { accountLedger } from '@/mocks/workspace/household-ledger'
import { ADRIAN, approvedStoryV3, release } from '@/mocks/workspace/__tests__/story-fixture'
import { blotterView } from '../blotter'

/** What disagrees between the blotter and the holdings, account by account, as "account symbol: why". */
function disagreements(): string[] {
  const view = blotterView(ADRIAN, {})
  if (!view) throw new Error('Adrian reads the blotter')
  const firstDay = view.days[0]
  if (firstDay === undefined) throw new Error('The blotter has no day')
  const filledBuys = view.rows.filter((r) => r.status === 'filled' && r.side === 'buy')
  const notHeld = filledBuys.flatMap((r) => {
    const held = accountLedger(r.accountId).positions.find((p) => p.symbol === r.symbol)
    if (!held) return [`${r.accountId} ${r.symbol}: ${r.id} filled a buy the holdings do not show`]
    return r.quantityUnit === 'sh' && held.quantity < r.quantity ? [`${r.accountId} ${r.symbol}: ${r.id} bought ${r.quantity}, the holding is ${held.quantity}`] : []
  })
  const unordered = accounts.flatMap((account) => {
    const { lots, positions } = accountLedger(account.id)
    return lots.filter((l) => l.purchaseDate >= firstDay).flatMap((lot) => {
      const symbol = positions.find((p) => p.id === lot.positionId)?.symbol
      const bought = filledBuys.some((r) => r.accountId === account.id && r.symbol === symbol && r.filledAt !== undefined
        && easternDayOf(r.filledAt) === lot.purchaseDate && r.quantity === lot.quantity)
      return bought ? [] : [`${account.id} ${symbol ?? lot.positionId}: the lot bought ${lot.purchaseDate} has no filled buy`]
    })
  })
  return [...notHeld, ...unordered]
}

describe('the blotter and the holdings agree, in every account', () => {
  it('at the start of the session', () => expect(disagreements()).toEqual([]))
  it("after the story's release: each fill is a lot, each lot a fill", () => {
    release(approvedStoryV3())
    expect(disagreements()).toEqual([])
  })
})
```

Run: `pnpm vitest run src/mocks/reference/__tests__/blotter-holdings.test.ts --testTimeout 30000`
Expected: FAIL, the start-of-session case listing exactly:
- `acc-002 UST-10Y: ord-014 filled a buy the holdings do not show`
- `acc-001 VFIAX: ord-013 filled a buy the holdings do not show`
- `acc-015 VNQ: ord-012 filled a buy the holdings do not show`
- `acc-002 SMH: the lot bought 2026-02-20 has no filled buy`

If the list differs, stop and report it: the seeds are not what this plan read.

- [ ] **Step 2: Correct the seeds**

In `src/mocks/handlers/oms.ts`, in `orders`:

```ts
  // ── Robert Johnson Individual (acc-002) ── (after ord-005)
  // The INTC harvest's replacement: 180 SMH bought five minutes after the INTC sale (ord-004), the purchase
  // pos-265 records and the activity feed states. Its value is the position's cost, 180 × 245.20 = $44,136.
  { id: 'ord-017', accountId: 'acc-002', symbol: 'SMH', side: 'buy', quantity: 180, orderType: 'market', status: 'filled', filledQuantity: 180, filledPrice: 245.20, submittedAt: '2026-02-20T15:20:00Z', filledAt: '2026-02-20T15:20:03Z', assetClass: 'equity' },
```

`ord-012`, `ord-013` and `ord-014` become canceled the day they were entered: `status: 'canceled', filledQuantity: 0`, and their `filledPrice` and `filledAt` removed; every other field stays (`ord-014` keeps `parAmount: 50000`, so the blotter still states its par). Replace the comment above `ord-013` with:

```ts
  // Canceled before the 4:00 PM ET cutoff, so it never priced: the Johnson Trust holds no VFIAX. (A fund
  // purchase that does fill prices at the next NAV, Rule 22c-1; `ticketValue` values it by its shares.)
```

and add one line above `ord-014`: `// A limit order canceled unfilled the same day: Robert Johnson Individual holds no Treasury.` and above `ord-012`: `// Canceled unfilled: Michael Martinez Individual holds no VNQ; the GLD sale's proceeds stayed in cash.`

In `src/mocks/data/activities.ts`, `smhPurchaseTimestamp` reads the ticket instead of deriving five minutes from `ord-004`:

```ts
const ord017 = orders.find((o) => o.id === 'ord-017')

/** The SMH replacement, as its ticket filled, on the day pos-265 records it opened. */
function smhPurchaseTimestamp(): string {
  const filled = ord017?.filledAt
  if (filled === undefined) throw new Error('The SMH replacement has no filled ticket (ord-017)')
  if (filled.slice(0, 10) !== KNOWN_OPEN_DATES.get(smh.id)) throw new Error(`SMH replacement at ${filled} is not on pos-265's open date`)
  return filled
}
```

and delete `ord004` if nothing else reads it (`rg -n "ord004" src/mocks/data/activities.ts`).

Run: `pnpm vitest run src/mocks/reference/__tests__/blotter-holdings.test.ts --testTimeout 30000`
Expected: PASS, both cases.

- [ ] **Step 3: The blotter's own tests follow the seeds**

In `src/mocks/reference/__tests__/blotter.test.ts`:
- "values a fill by what it is" becomes:

```ts
  it('values each fill, and states no value for a ticket that never filled', () => {
    expect(row('ord-017')).toMatchObject({ side: 'buy', status: 'filled', value: 44_136, filledAt: '2026-02-20T15:20:03Z' })
    expect(row('ord-015')?.value).toBeCloseTo(21_862.5, 6)
    for (const id of ['ord-012', 'ord-013', 'ord-014']) expect(row(id), id).toMatchObject({ status: 'canceled' })
    for (const id of ['ord-012', 'ord-013', 'ord-014']) expect(row(id)?.value, id).toBeUndefined()
    expect(row('ord-016')).toMatchObject({ side: 'buy', status: 'working' })
  })
```

- "filters by status, account and submitted day": `expect(view({ status: 'canceled' }).rows.map((r) => r.id)).toEqual(['ord-012', 'ord-009', 'ord-013', 'ord-014'])`.
- The quantity case keeps `ord-014` (par 50,000; its figure label "Par").

In `src/workspace/__tests__/blotter-view.test.tsx` line 22: `expect(within(orders()).getByRole('row', { name: /ord-017/ })).toHaveTextContent('44,136')`.

Run: `pnpm vitest run src/mocks/reference/__tests__ src/workspace/__tests__/blotter-view.test.tsx src/mocks/data/__tests__ --testTimeout 30000`
Expected: PASS. A data test that counted filled tickets or the activity feed's SMH time fails only if it read `ord-004 + 5 minutes` by hand; point it at `ord-017`.

- [ ] **Step 4: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/reference-views.spec.ts
git status --short e2e-visual/__baselines__
```

Open `blotter-light.png`: the SMH buy filled on 20 Feb; UST-10Y, VFIAX and VNQ read CANCELED with no value. Nothing else moves. Then the full suite and the end-of-task checks.

```bash
git add src/mocks/handlers/oms.ts src/mocks/data/activities.ts src/mocks/reference/__tests__/blotter-holdings.test.ts src/mocks/reference/__tests__/blotter.test.ts src/workspace/__tests__/blotter-view.test.tsx e2e-visual/__baselines__/blotter-light.png
git commit -m "fix(book): every fill on the blotter is in the holdings and every recent lot has its order; SMH gets its ticket

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 3: The rebalancer counts working orders (spec §4 "The rebalancer accounts for working orders")

A working order counts toward the proposal: the legs are sized from holdings with the working orders filled, buys draw on cash net of them, a sale never takes shares a working sale already takes, and the pre-trade check, the drift after and the risk after read the same starting book. The version records what it counted; the proposal says it in one line; the Proposal Agent's summary names it; the Pre-trade Check warns when a leg trades a symbol a working order already trades.

This moves the story's figures. With the working buy of 200 QQQ (96,000 USD at its limit) counted, the engine gives (prototype run at `55ab98b`):

| Version | Before (`55ab98b`) | After this task |
|---|---|---|
| v1 | sell 7,000 INTC · sell 758 SPY · buy 3,578 EFA · buy 4,441 VWO · buy 1,567 AGG · buy 5,652 QAI · buy 369 GLD · sell 3,882 ETHE · sell 3,234 IBIT; est. additional tax 10,422 | sell 7,000 INTC · sell 943 SPY · buy 3,600 EFA · buy 4,469 VWO · buy 1,577 AGG · buy 5,688 QAI · buy 371 GLD · sell 3,882 ETHE · sell 3,234 IBIT; est. additional tax 14,454 |
| v2 (harvest only) | sell 7,000 INTC · buy 1,118 EFA · buy 1,388 VWO · buy 490 AGG · buy 1,767 QAI · buy 115 GLD; tax 0 | sell 7,000 INTC · buy 769 EFA · buy 954 VWO · buy 336 AGG · buy 1,215 QAI · buy 79 GLD; tax 0 |
| v3 (QAI excluded) | v2 without QAI | v2 without QAI |

v1 sells more SPY because the QQQ buy adds to the US equity overweight; v2 and v3 buy less because the working buy spends cash the buys may otherwise draw. If the engine's figures after Step 4 differ from this table, stop and report the difference: something other than the working order moved.

**Files:**
- Modify: `src/mocks/workspace/household-ledger.ts` (`WorkingMove`, `workingMovesOf`), `src/mocks/handlers/oms.ts` (`HoldingMove`, `holdingsAfterTrades`, `GenerationConstraints.workingOrders`, `generateRebalanceProposal`, `projectDrift`, `PreviewEntry`, `buildRebalancePreviews`), `src/mocks/handlers/compliance.ts` (`evaluateProposal`), `src/services/oms.ts` (`ProposalConstraint`, `ProposalViolation.workingOrder`, `WorkingOrderRef`), `src/mocks/workspace/suitability.ts` (`modelAboveTolerance`, `withSuitability`), `src/types/workspace-proposal.ts` (`CountedWorkingOrder`, `ProposalVersion.workingOrders`, `DraftPreview`), `src/mocks/workspace/proposal-engine.ts` (`buildVersion`), `src/mocks/workspace/proposals.ts` (three `buildVersion` calls), `src/mocks/agents/proposal-agent.ts` (`workingOrderSentence`), `src/mocks/agents/pretrade-check.ts`, `src/workspace/thread/embeds/ProposalEmbed.tsx`
- Create: `src/workspace/proposal/WorkingOrdersNote.tsx`, `src/workspace/proposal/working-order-words.ts`, `src/mocks/workspace/__tests__/working-orders.test.ts`, `src/workspace/__tests__/working-orders-note.test.tsx`
- Test updates: the tests that pin the story's figures (`rg -ln "10_422|10422|\b758\b|\b490\b|\b1_118\b|\b1_767\b" src --glob '**/__tests__/**'`), and any literal `ProposalVersion` or `DraftPreview` the type-check names.

**Interfaces:**
- Consumes: `accountLedger`, `OpenOrder` (Task 1); `usdQuoteFor` (`pms.ts`); `claimNameOf` (`src/mocks/agents/claim-name.ts`); `fmtQuantity`, `fmtPrice` (`src/kit/measure.ts`).
- Produces:
  - `type WorkingMove = { orderId: string; symbol: string; name?: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; assetClass: AssetClass; limitPrice?: number }` and `workingMovesOf(accountId: string, exceptProposalId?: string): WorkingMove[]` in `household-ledger.ts`.
  - `type HoldingMove = Pick<ProposedTradeLeg, 'symbol' | 'side' | 'estimatedValue' | 'assetClass'>` in `oms.ts`; `holdingsAfterTrades(account, positions, moves: readonly HoldingMove[])`; `GenerationConstraints.workingOrders?: readonly HoldingMove[]`; `projectDrift(accountId, legs, taxAware, driftThreshold?, modelId?, constrainedBy?, working: readonly HoldingMove[] = [])`; `PreviewEntry.working?: readonly HoldingMove[]`.
  - `type WorkingOrderRef = { orderId: string; symbol: string; side: 'buy' | 'sell'; quantity: number }` and the category `'working_order'` with `ProposalViolation.workingOrder?: WorkingOrderRef` in `src/services/oms.ts`.
  - `evaluateProposal(accountId, trades, working: readonly (WorkingOrderRef & { estimatedValue: number; assetClass: AssetClass })[] = [])`.
  - `modelAboveTolerance(account, legs, working: readonly HoldingMove[] = [])`, `withSuitability(result, account, legs, working: readonly HoldingMove[] = [])`.
  - `type CountedWorkingOrder = { orderId: string; symbol: string; name?: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; limitPrice?: number }`; `ProposalVersion.workingOrders: CountedWorkingOrder[]`; `DraftPreview` includes `'workingOrders'`.
  - `buildVersion(accountId, constraints, edits, proposalId?: string)`.
  - `workingOrderWords(order: Pick<CountedWorkingOrder, 'side' | 'quantity' | 'symbol' | 'limitPrice'>): string` ("buy 200 QQQ, limit 480.00") in `src/workspace/proposal/working-order-words.ts`; Task 10 reuses it.

- [ ] **Step 1: Failing tests**

Create `src/mocks/workspace/__tests__/working-orders.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { workingMovesOf } from '../household-ledger'
import { AGENT_CONSTRAINTS, versionOf } from './proposal-fixture'
import { approvedV1 } from './story-fixture'

const leg = (v: ReturnType<typeof versionOf>, symbol: string) => v.preview.trades.find((t) => t.symbol === symbol)

describe('the rebalancer counts working orders', () => {
  it('records the working QQQ buy it counted, valued at its limit', () => {
    expect(versionOf(1, AGENT_CONSTRAINTS).workingOrders).toEqual([
      { orderId: 'ord-005', symbol: 'QQQ', name: 'Invesco QQQ Trust', side: 'buy', quantity: 200, estimatedValue: 96_000, limitPrice: 480 },
    ])
  })

  it("never doubles it: v1 trades no QQQ, and sells more SPY because the order adds to US equity", () => {
    const v1 = versionOf(1, AGENT_CONSTRAINTS)
    expect(leg(v1, 'QQQ')).toBeUndefined()
    expect(leg(v1, 'SPY')).toMatchObject({ side: 'sell', quantity: 943 })
    expect(v1.preview.estimatedTaxImpact).toBe(14_454)
  })

  it('measures the drift after with the working order filled: US equity ends inside its band', () => {
    const { projectedDrift } = versionOf(1, AGENT_CONSTRAINTS).preview
    const us = projectedDrift.assetClassDrifts.find((d) => d.assetClass === 'us_equity')
    if (!us) throw new Error('v1 measures US equity')
    expect(Math.abs(us.drift)).toBeLessThanOrEqual(projectedDrift.driftTolerance)
  })

  it('spends cash net of the working buy: the pre-trade cash is the cash less the order, plus sales, less buys', () => {
    const v3 = versionOf(3, [...AGENT_CONSTRAINTS, { kind: 'harvest_only' }], [{ kind: 'exclude', symbol: 'QAI' }])
    const sold = v3.preview.trades.filter((t) => t.side === 'sell').reduce((s, t) => s + t.estimatedValue, 0)
    const bought = v3.preview.trades.filter((t) => t.side === 'buy').reduce((s, t) => s + t.estimatedValue, 0)
    expect(v3.pretrade.projectedCash).toBeCloseTo(225_504 - 96_000 + sold - bought, 2)
  })

  it('warns when a leg trades a symbol a working order already trades', () => {
    const r = evaluateProposal('acc-002', [{ symbol: 'QQQ', side: 'sell', quantity: 10, estimatedValue: 4_852 }], workingMovesOf('acc-002'))
    expect(r?.violations.find((v) => v.category === 'working_order')).toMatchObject({
      severity: 'warning', symbol: 'QQQ', legs: [0], workingOrder: { orderId: 'ord-005', symbol: 'QQQ', side: 'buy', quantity: 200 },
    })
  })

  it('leaves the trade ticket as it was: no working orders, no change', () => {
    const trades = [{ symbol: 'SPY', side: 'sell' as const, quantity: 10, estimatedValue: 5_203 }]
    expect(evaluateProposal('acc-002', trades, [])).toEqual(evaluateProposal('acc-002', trades))
  })

  it("leaves a proposal's own pending orders out: they are its legs", () => {
    const a = approvedV1()
    expect(workingMovesOf('acc-002', a.proposalId).map((w) => w.orderId)).toEqual(['ord-005'])
    expect(workingMovesOf('acc-002').length).toBeGreaterThan(1)
  })
})
```

Create `src/workspace/__tests__/working-orders-note.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkingOrdersNote } from '@/workspace/proposal/WorkingOrdersNote'

describe('WorkingOrdersNote', () => {
  it('says which working orders the version counted, with quantity and limit', () => {
    render(<WorkingOrdersNote orders={[{ orderId: 'ord-005', symbol: 'QQQ', name: 'Invesco QQQ Trust', side: 'buy', quantity: 200, estimatedValue: 96_000, limitPrice: 480 }]} />)
    expect(screen.getByText('Counts the working order already open in this account as filled: buy 200 QQQ, limit 480.00.')).toBeInTheDocument()
  })
  it('says nothing when none was counted', () => {
    const { container } = render(<WorkingOrdersNote orders={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/working-orders.test.ts src/workspace/__tests__/working-orders-note.test.tsx --testTimeout 30000`
Expected: FAIL ("workingMovesOf is not exported", "Failed to resolve import '@/workspace/proposal/WorkingOrdersNote'").

- [ ] **Step 2: The ledger's working moves**

Append to `src/mocks/workspace/household-ledger.ts`:

```ts
/** An open order as a proposal counts it: what it moves once filled. `name` is the holding's or the quote's, when either names it. */
type WorkingMove = {
  orderId: string; symbol: string; name?: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; assetClass: AssetClass; limitPrice?: number
}

/**
 * The open orders a proposal for this account counts as filled: every working ticket, and every other proposal's
 * orders pending compliance release. A proposal's own pending orders are its legs, so `exceptProposalId` leaves them out.
 */
export function workingMovesOf(accountId: string, exceptProposalId?: string): WorkingMove[] {
  const { positions, openOrders } = accountLedger(accountId)
  return openOrders
    .filter((o) => !(o.source.kind === 'proposal' && o.source.proposalId === exceptProposalId))
    .map((o) => {
      const name = positions.find((p) => p.symbol === o.symbol)?.name ?? usdQuoteFor(o.symbol)?.name
      return {
        orderId: o.id, symbol: o.symbol, ...(name !== undefined ? { name } : {}), side: o.side, quantity: o.quantity,
        estimatedValue: o.estimatedValue, assetClass: o.assetClass, ...(o.limitPrice !== undefined ? { limitPrice: o.limitPrice } : {}),
      }
    })
}
```

- [ ] **Step 3: The rebalancer, the pre-trade check and the risk after count them**

In `src/mocks/handlers/oms.ts`:

```ts
/** What moves a holding and cash: a leg, or a working order counted as filled. */
export type HoldingMove = Pick<ProposedTradeLeg, 'symbol' | 'side' | 'estimatedValue' | 'assetClass'>
```

- `holdingsAfterTrades(account, positions, legs: readonly HoldingMove[])` (the body is unchanged: it reads only those four fields).
- `GenerationConstraints` gains:

```ts
  /** Working orders counted as filled: the legs are sized from holdings with them filled, buys draw on cash net of them, and a sale never takes what a working sale takes. */
  workingOrders?: readonly HoldingMove[]
```

- In `generateRebalanceProposal`, replace the `drift` line and the `cashValue` line:

```ts
  const working = constraints.workingOrders ?? []
  const committedCash = working.reduce((s, w) => s + (w.side === 'buy' ? w.estimatedValue : -w.estimatedValue), 0)
  const workingSold = new Map<string, number>()
  for (const w of working) if (w.side === 'sell') workingSold.set(w.symbol, (workingSold.get(w.symbol) ?? 0) + w.estimatedValue)
  const drift = working.length === 0
    ? computeDriftForAccount(account, modelIdFor(account, modelId))
    : computeDriftForHoldings(account, holdingsAfterTrades(account, positions, working), modelIdFor(account, modelId))
```

```ts
  const cashValue = (positions.find((p) => p.symbol === 'CASH')?.marketValue ?? account.cashBalance) - committedCash
```

and in the sell loop: `const notional = Math.min(remaining, harvestOnly ? lossValueOf(position) : position.marketValue - (workingSold.get(position.symbol) ?? 0))`.

- `projectDrift` gains a last parameter `working: readonly HoldingMove[] = []`, and `const after = computeDriftForHoldings(account, holdingsAfterTrades(account, positions, [...working, ...legs]), modelIdFor(account, modelId))`.
- `PreviewEntry = { account: Account; modelId?: string; working?: readonly HoldingMove[] } & RebalanceProposal`; in `buildRebalancePreviews`, `projectDrift(account.id, trades, taxAware, driftThreshold, proposed[i]!.modelId, proposed[i]!.heldBack, proposed[i]!.working ?? [])`.

In `src/services/oms.ts`: add `| 'working_order'` to `ProposalConstraint`, and:

```ts
/** A working order a proposal leg overlaps: the order already open on the same security. */
export type WorkingOrderRef = { orderId: string; symbol: string; side: 'buy' | 'sell'; quantity: number }
```

and on `ProposalViolation`: `/** The working-order check: the order already open on the leg's security. */ workingOrder?: WorkingOrderRef`.

In `src/mocks/handlers/compliance.ts`, `evaluateProposal(accountId, trades, working: readonly (WorkingOrderRef & { estimatedValue: number; assetClass: AssetClass })[] = [])` (import `WorkingOrderRef` and `AssetClass` as types):
- after `held` is built from the positions, the working orders are part of the starting book:

```ts
  // Working orders are counted as filled: they are the book the proposal starts from, never one of its legs.
  for (const w of working) {
    const was = held.get(w.symbol)
    const signed = w.side === 'buy' ? w.estimatedValue : -w.estimatedValue
    held.set(w.symbol, { value: Math.max(0, (was?.value ?? 0) + signed), assetClass: was?.assetClass ?? w.assetClass })
  }
```

- the overlap check, before the cash section:

```ts
  // ── A leg on a security a working order already trades: the proposal counts the order; a second order is the advisor's call ──
  for (const w of working) {
    const on = trades.flatMap((t, i) => (t.symbol === w.symbol ? [i] : []))
    if (on.length === 0) continue
    violations.push({
      category: 'working_order', constraint: 'Working order on the same security', severity: 'warning',
      currentValue: `${w.side} ${w.quantity}`, limit: 'One open order per security',
      message: `A working order to ${w.side} ${w.quantity} ${w.symbol} (${w.orderId}) is already open in this account; this proposal also trades ${w.symbol}.`,
      legs: on, preExisting: true, symbol: w.symbol, workingOrder: { orderId: w.orderId, symbol: w.symbol, side: w.side, quantity: w.quantity },
    })
  }
```

- `const startingCash = cashBalanceOf(account) - working.reduce((s, w) => s + (w.side === 'buy' ? w.estimatedValue : -w.estimatedValue), 0)`.

In `src/mocks/workspace/suitability.ts`: `modelAboveTolerance(account, legs, working: readonly HoldingMove[] = [])` reads `holdingsAfterTrades(account, getPositionsForAccount(account.id, account.totalValue), [...working, ...legs])`; `withSuitability(result, account, legs, working: readonly HoldingMove[] = [])` passes it on.

- [ ] **Step 4: The version records and counts them**

In `src/types/workspace-proposal.ts`:

```ts
/** A working order the version counted as filled: an OMS ticket, or another proposal's order pending release. */
export type CountedWorkingOrder = { orderId: string; symbol: string; name?: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number; limitPrice?: number }
```

`ProposalVersion` gains `/** What the version counted as already traded; its legs are sized with these filled. */ workingOrders: CountedWorkingOrder[]`, and `DraftPreview` picks `'workingOrders'` too.

In `src/mocks/workspace/proposal-engine.ts`, `buildVersion(accountId, constraints, edits, proposalId?: string)`:

```ts
  const working = workingMovesOf(accountId, proposalId)
  const generated = generateRebalanceProposal(accountId, true, PROPOSAL_DRIFT_THRESHOLD, undefined, {
    ...generationConstraintsOf(constraints), workingOrders: working, ...(avoidsWash ? { protectHarvests: flaggedHarvests(account) } : {}),
  })
```

then `buildRebalancePreviews([{ account, working, ...edited.proposal }], …)`, `evaluateProposal(accountId, preview.trades.map(…), working)`, `withSuitability(evaluated, account, edited.proposal.legs, working)`; the fingerprint content gains `working: working.map((w) => [w.orderId, w.quantity])`; and `built` gains

```ts
      workingOrders: working.map(({ orderId, symbol, name, side, quantity, estimatedValue, limitPrice }) => ({
        orderId, symbol, ...(name !== undefined ? { name } : {}), side, quantity, estimatedValue, ...(limitPrice !== undefined ? { limitPrice } : {}),
      })),
```

In `src/mocks/workspace/proposals.ts`, the three calls that have the proposal pass its id: `buildVersion(proposal.accountId, constraints, [], proposal.id)` (revise), `buildVersion(proposal.accountId, latest.constraints, edits, proposal.id)` (save), `buildVersion(proposal.accountId, latestVersion(proposal).constraints, edits, proposal.id)` (preview). `createProposal` keeps three arguments.

- [ ] **Step 5: The Proposal Agent and the Pre-trade Check say so**

In `src/mocks/agents/proposal-agent.ts`:

```ts
/** The working orders the version counted, named without digits. */
function workingOrderSentence({ workingOrders }: Pick<DraftPreview, 'workingOrders'>): string {
  if (workingOrders.length === 0) return ''
  const named = joinWords(workingOrders.map((w) => `${w.side === 'buy' ? 'a buy' : 'a sale'} of ${claimNameOf(w.symbol, w.name)}`))
  return ` It counts ${workingOrders.length === 1 ? 'the working order' : 'the working orders'} already open in this account (${named}) as filled, so it does not trade them again.`
}
```

and append `${workingOrderSentence(built)}` at the end of both returns of `draftSummary` and of `revisionSummary` (before `${carried}` there).

In `src/mocks/agents/pretrade-check.ts`:
- imports: `generateRebalanceProposal` (in place of `generateRebalanceTrades`), `accountLedger`, `workingMovesOf` from `@/mocks/workspace/household-ledger`; drop `getPositionsForAccount`;
- in `runPretradeCheck`:

```ts
  const working = workingMovesOf(account.id)
  const legs = generateRebalanceProposal(account.id, true, undefined, undefined, { workingOrders: working }).legs
  if (legs.length === 0) return info('There is no rebalance proposal to check.')
  const evaluated = evaluateProposal(account.id, legs.map((l) => ({ symbol: l.symbol, side: l.side, quantity: l.quantity, estimatedValue: l.estimatedValue })), working)
  if (!evaluated) return info('The pre-trade check could not evaluate this account.')
  const result = withSuitability(evaluated, account, legs, working)
  if (result.violations.length === 0) return info('No pre-trade check flagged the proposal.')
  const names: Names = new Map([...accountLedger(account.id).positions.map((p) => [p.symbol, p.name] as const), ...legs.map((l) => [l.symbol, l.name] as const)])
```

- `describe` gains:

```ts
    case 'working_order': {
      const w = v.workingOrder
      if (!w) throw new Error('A working_order violation names no working order')
      return { who: securityName(names, w.symbol), label: w.symbol, phrase: `already has a working order to ${w.side} in this account, and the proposal trades it too` }
    }
```

- and the figures branch: `else if (v.category === 'working_order' && v.workingOrder) figures.push({ label: `Working order · ${v.workingOrder.symbol}`, value: v.workingOrder.quantity, unit: 'sh', source: 'orders.quantity' })` before the weight branch.

- [ ] **Step 6: The proposal shows what it counted**

Create `src/workspace/proposal/working-order-words.ts`:

```ts
import { fmtPrice, fmtQuantity } from '@/kit/measure'
import type { CountedWorkingOrder } from '@/types/workspace-proposal'

/** A working order as a line reads it: "buy 200 QQQ, limit 480.00". */
export const workingOrderWords = ({ side, quantity, symbol, limitPrice }: Pick<CountedWorkingOrder, 'side' | 'quantity' | 'symbol' | 'limitPrice'>): string =>
  `${side} ${fmtQuantity(quantity)} ${symbol}${limitPrice !== undefined ? `, limit ${fmtPrice(limitPrice)}` : ''}`
```

Create `src/workspace/proposal/WorkingOrdersNote.tsx`:

```tsx
import type { CountedWorkingOrder } from '@/types/workspace-proposal'
import { workingOrderWords } from './working-order-words'

/** The working orders a version counted as filled, so a reviewer sees why its legs leave them alone. */
export function WorkingOrdersNote({ orders }: { orders: readonly CountedWorkingOrder[] }) {
  if (orders.length === 0) return null
  const which = orders.length === 1 ? 'the working order' : 'the working orders'
  return <p className="text-body text-ink-2">{`Counts ${which} already open in this account as filled: ${orders.map(workingOrderWords).join('; ')}.`}</p>
}
```

In `ProposalEmbed.tsx`, after `<ProposalLegsTable … />`: `<WorkingOrdersNote orders={latest.workingOrders} />`.

Run: `pnpm vitest run src/mocks/workspace/__tests__/working-orders.test.ts src/workspace/__tests__/working-orders-note.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: The story's pinned figures follow**

Run: `pnpm type-check` and add `workingOrders: []` to each literal `ProposalVersion` or `DraftPreview` it names (test fixtures only; the engine builds them). Then `pnpm vitest run --testTimeout 30000`. The tests that fail pin a story figure from the table above, or the Proposal Agent's summary text (which now ends with the working-order sentence). For each: confirm the new value is the table's "After" value, update the expectation, and list "file: old → new" in the commit body. A failure that is neither is a bug: stop and report it. `pre-trade-invariants.test.ts`, `rebalance-preview-builder.test.ts` and the tax tests call the engine without `workingOrders` and must not change.

- [ ] **Step 8: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/shell.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: the proposal says "Counts the working order already open in this account as filled: buy 200 QQQ, limit 480.00."; v1 sells 943 SPY with an estimated additional tax of 14,454 USD; v2 and v3 buy the smaller quantities; the fills, the blotter link, Mark's orders, the letter and the meeting's prep read the new fills. Only proposal scenes move. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(rebalance): a proposal counts the working orders already open, never doubles one, and says so; the pre-trade check warns on an overlap

Pinned figures moved (one line each, file: old → new), e.g.
proposal-engine.test.ts: v1 SPY sell 758 → 943; v1 est. additional tax 10,422 → 14,454

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Meeting Prep and Meeting Notes check the ledger (spec §4 "Meeting notes check what filled", "Notes agree with Risk")

Meeting Prep's "what changed today" reads the ledger's fills for the day. Meeting Notes drafts from the transcript and the ledger together: its rebalance line says what the ledger shows on the meeting's day, and its line on Patricia's accounts says what the Risk view shows. The transcript stays as spoken; the notes never repeat a transcript claim the ledger contradicts.

**Files:**
- Modify: `src/mocks/agents/meeting-notes.ts` (`NotesFacts`, `RebalanceState`, script lines n-01 and n-03, `draftNotesFromTranscript`), `src/mocks/workspace/meeting-agents.ts` (`notesFactsOf`, `draftMeetingNotes`), `src/mocks/agents/meeting-prep.ts` (`changes`, `valueOf`)
- Modify tests: `src/mocks/agents/__tests__/meeting-notes.test.ts`, `src/mocks/agents/__tests__/meeting-prep.test.ts`
- Create: `src/mocks/workspace/__tests__/notes-check-ledger.test.ts`

**Interfaces:**
- Consumes: `householdLedger`, `accountLedger` (Task 1); `clientRiskOf` (`src/mocks/reference/risk.ts`); `householdFixtures`; `meetingDay` (`src/mocks/workspace/meetings.ts`).
- Produces:
  - In `meeting-notes.ts`: `type RebalanceState = 'filled' | 'awaiting_release' | 'not_approved'`; `type NotesFacts = { rebalance: RebalanceState; wholes: ReadonlyMap<string, { tolerance: string; status: WholeStatus }> }`; `draftNotesFromTranscript(eventId: string, meetingDay: string, facts: NotesFacts): NoteLine[]`; `REBALANCE_LINE: Readonly<Record<RebalanceState, string>>` (exported for the story guard, Task 14).
  - In `meeting-agents.ts`: `notesFactsOf(householdId: string, day: string): NotesFacts`.

- [ ] **Step 1: Failing tests**

Create `src/mocks/workspace/__tests__/notes-check-ledger.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { clientRiskOf } from '@/mocks/reference/risk'
import { REBALANCE_LINE } from '@/mocks/agents/meeting-notes'
import { runMeetingPrepAgent } from '@/mocks/agents/meeting-prep'
import { holdMeeting } from '../meetings'
import { draftMeetingNotes, notesFactsOf } from '../meeting-agents'
import { approvedStoryV3, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const line = (id: string) => {
  const found = store().meetings[0]?.notesDraft?.find((l) => l.id === id)
  if (!found) throw new Error(`no note line ${id}`)
  return found.text
}
const holdAndDraft = () => { ok(holdMeeting(ADRIAN, 'evt-010')); ok(draftMeetingNotes(ADRIAN, 'evt-010')) }

describe('Meeting Notes checks what filled on the meeting day', () => {
  it("says \"this morning's rebalance\" only once the rebalance has filled that day", () => {
    release(approvedStoryV3())
    holdAndDraft()
    expect(line('n-01')).toBe(REBALANCE_LINE.filled)
    expect(line('n-01')).toContain("this morning's rebalance")
  })
  it('reads as a plan when the review is held before the release', () => {
    approvedStoryV3()
    holdAndDraft()
    expect(line('n-01')).toBe(REBALANCE_LINE.awaiting_release)
    expect(line('n-01')).toContain('approved and awaiting compliance release')
  })
  it('says nothing was traded when nothing was approved', () => {
    holdAndDraft()
    expect(line('n-01')).toBe(REBALANCE_LINE.not_approved)
    expect(line('n-01')).not.toMatch(/this morning|rebalanced/)
  })
})

describe("Meeting Notes states Patricia's accounts as the Risk view shows them", () => {
  it("follows her accounts as a whole against her own tolerance, not the transcript's \"well away from the models\"", () => {
    const risk = clientRiskOf('cli-002')
    if (!risk) throw new Error('Patricia holds measured accounts')
    // The engine's reading at 55ab98b: 34 pts, within Moderate Conservative 26–40. If this differs, report it; do not edit it.
    expect([risk.posture.score, risk.posture.status, risk.posture.tolerance.band]).toEqual([34, 'within', 'Moderate Conservative'])
    holdAndDraft()
    expect(line('n-03')).toBe("Reviewed Patricia's accounts: as a whole they sit within her Moderate Conservative tolerance. Patricia said she is more cautious than the models on her accounts assume.")
    expect(line('n-03')).not.toMatch(/well away/)
  })
  it('reads each member from the ledger and the Risk view at the time it drafts', () => {
    expect(notesFactsOf('hh-001', '2026-02-25')).toEqual({
      rebalance: 'not_approved',
      wholes: new Map([['cli-001', { tolerance: 'Moderate', status: 'within' }], ['cli-002', { tolerance: 'Moderate Conservative', status: 'within' }]]),
    })
  })
})

describe("Meeting Prep's changes are the ledger's fills on the day", () => {
  const changes = () => {
    const found = runMeetingPrepAgent('hh-001', '2026-02-25T15:00:00Z').find((f) => f.agendaTitle === 'Changes since the last review' || f.agendaTitle === "This morning's rebalance and harvest")
    if (!found) throw new Error('Meeting Prep reports what changed')
    return found
  }
  it('before any release: nothing filled today', () => expect(changes().claim).toBe("No orders have been filled in the household's accounts today."))
  it("after the release: the day's fills", () => {
    release(approvedStoryV3())
    expect(changes().claim).toMatch(/^Orders released today were filled in /)
  })
})
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/notes-check-ledger.test.ts --testTimeout 30000`
Expected: FAIL ("REBALANCE_LINE is not exported", "notesFactsOf is not exported").

- [ ] **Step 2: Notes from the transcript and the ledger**

In `src/mocks/agents/meeting-notes.ts`:

```ts
import type { WholeStatus } from '@/types/reference-risk'

/** What the ledger showed on the meeting's day about the household's rebalance. */
type RebalanceState = 'filled' | 'awaiting_release' | 'not_approved'
/** What Meeting Notes checks the transcript against: the rebalance on the meeting's day, and each client's accounts as a whole against their own tolerance. */
export type NotesFacts = { rebalance: RebalanceState; wholes: ReadonlyMap<string, { tolerance: string; status: WholeStatus }> }

/** The Intel harvest and the rebalance as the ledger shows them; the transcript (t-02) stays as spoken. */
export const REBALANCE_LINE: Readonly<Record<RebalanceState, string>> = {
  filled: "Reviewed this morning's rebalance and the Intel harvest: the loss is deductible now only if Intel is not bought back before its window closes.",
  awaiting_release: 'Reviewed the rebalance and the Intel harvest; the rebalance is approved and awaiting compliance release, and the loss will be deductible only if Intel is not bought back before its window closes.',
  not_approved: 'Discussed a rebalance and the Intel harvest; nothing has been approved or traded yet, and a loss would be deductible only if Intel is not bought back before its window closes.',
}

const PATRICIA = 'cli-002'

/** Patricia's accounts as the Risk view reads them, not as the transcript (t-09) put it. */
function patriciaLine({ wholes }: NotesFacts): string {
  const whole = wholes.get(PATRICIA)
  if (!whole) throw new Error("Meeting Notes: the Risk view has no reading of Patricia's accounts as a whole")
  return `Reviewed Patricia's accounts: as a whole they sit ${whole.status} her ${whole.tolerance} tolerance. Patricia said she is more cautious than the models on her accounts assume.`
}
```

- `ScriptLine.text` becomes `string | ((facts: NotesFacts) => string)`.
- n-01: `text: (facts) => REBALANCE_LINE[facts.rebalance]`; n-03: `text: patriciaLine`. Their `section` and `cites` are unchanged.
- `draftNotesFromTranscript(eventId: string, meetingDay: string, facts: NotesFacts)`: inside the map, `const text = typeof line.text === 'function' ? line.text(facts) : line.text` and every returned line carries `text`. Update the doc comment: "Each line records only what was said or decided, citing where; a line about the book states what the ledger and the Risk view show on the meeting's day."

- [ ] **Step 3: The wiring reads the ledger**

In `src/mocks/workspace/meeting-agents.ts`:

```ts
import type { NotesFacts } from '@/mocks/agents/meeting-notes'
import { householdFixtures } from '@/mocks/data/households'
import { clientRiskOf } from '@/mocks/reference/risk'
import { householdLedger } from './household-ledger'

/** What the ledger and the Risk view show for the household on `day`: the notes are checked against it. */
export function notesFactsOf(householdId: string, day: string): NotesFacts {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household) throw new Error(`No household ${householdId}`)
  const ledger = householdLedger(householdId, day)
  const rebalance = ledger.fillsOnDay.some((f) => f.source.kind === 'proposal') ? 'filled'
    : ledger.openOrders.some((o) => o.status === 'pending_compliance') ? 'awaiting_release'
    : 'not_approved'
  const wholes = new Map(household.members.flatMap((m) => {
    const risk = clientRiskOf(m.clientId)
    if (!risk) return []
    const { status, tolerance } = risk.posture
    // A client's accounts as a whole are always measured (ClientRisk); a glide-path status here is a broken invariant.
    if (status === 'glide_path') throw new Error(`${m.clientId}'s accounts as a whole carry a glide-path status`)
    return [[m.clientId, { tolerance: tolerance.band, status }] as const]
  }))
  return { rebalance, wholes }
}
```

A member with no measured account has no reading; the notes refuse to draft only if the line that needs that member (Patricia's) has none.

In `draftMeetingNotes`: `const day = meetingDay(meeting)` and `notesDraft: draftNotesFromTranscript(meeting.eventId, day, notesFactsOf(meeting.householdId, day))`.

- [ ] **Step 4: Meeting Prep reads the day's fills**

In `src/mocks/agents/meeting-prep.ts`: drop `ledgerFills` and `getPositionsForAccount`; import `accountLedger`, `householdLedger` from `@/mocks/workspace/household-ledger` and `easternDayOf` from `@/lib/eastern-day`.

```ts
const valueOf = (a: Account) => accountLedger(a.id).positions.reduce((s, p) => s + p.marketValue, 0)

/** What changed today: the ledger's fills in the household's accounts on the day the agent speaks. */
function changes(householdId: string, own: readonly Account[], asOf: string): PrepFinding {
  const fills = householdLedger(householdId, easternDayOf(asOf)).fillsOnDay
  …the rest unchanged, reading `fills` (each has `accountId`, `side`, `value`)…
}
```

and `runMeetingPrepAgent` calls `changes(householdId, own, asOf)`.

- [ ] **Step 5: The agent's own tests take the facts**

In `src/mocks/agents/__tests__/meeting-notes.test.ts`:

```ts
import type { NotesFacts } from '../meeting-notes'
const FACTS: NotesFacts = { rebalance: 'filled', wholes: new Map([['cli-001', { tolerance: 'Moderate', status: 'within' }], ['cli-002', { tolerance: 'Moderate Conservative', status: 'within' }]]) }
const notes = draftNotesFromTranscript('evt-010', '2026-02-25', FACTS)
```

and add:

```ts
  it('states the rebalance as the facts give it, and refuses to draft without a reading of Patricia', () => {
    for (const rebalance of ['filled', 'awaiting_release', 'not_approved'] as const) {
      const n01 = draftNotesFromTranscript('evt-010', '2026-02-25', { ...FACTS, rebalance }).find((l) => l.id === 'n-01')
      expect(n01?.text).toBe(REBALANCE_LINE[rebalance])
    }
    expect(() => draftNotesFromTranscript('evt-010', '2026-02-25', { ...FACTS, wholes: new Map() })).toThrow("no reading of Patricia's accounts as a whole")
  })
  it('says above or below when the Risk view does', () => {
    const above = draftNotesFromTranscript('evt-010', '2026-02-25', { ...FACTS, wholes: new Map([['cli-002', { tolerance: 'Moderate Conservative', status: 'above' }]]) })
    expect(above.find((l) => l.id === 'n-03')?.text).toContain('as a whole they sit above her Moderate Conservative tolerance')
  })
```

The existing "states no figure", "never names household" and "cites" cases keep passing with the new texts (no digit, no "household"). In `src/mocks/agents/__tests__/meeting-prep.test.ts`, a case that read `ledgerFills()` reads `householdLedger('hh-001').fillsOnDay`.

Run: `pnpm vitest run src/mocks/agents/__tests__ src/mocks/workspace/__tests__ --testTimeout 30000`
Expected: PASS. A meeting test that expected the old n-01 text after a release (`meeting-filing`, `meeting-recap`) now reads `REBALANCE_LINE.filled` when the story released first, else the state its setup gives; edit the expectation to that state, never the engine.

- [ ] **Step 6: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/meeting-review.spec.ts
git status --short e2e-visual/__baselines__
```

Open `meeting-after-light.png` and `meeting-after-dark.png`: the morning in that spec releases v1 before the meeting, so n-01 reads "this morning's rebalance"; n-03 reads "as a whole they sit within her Moderate Conservative tolerance". Nothing else moves. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "fix(notes): Meeting Notes states the rebalance as the ledger shows it that day and Patricia's accounts as the Risk view does; Meeting Prep reads the day's fills

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Every agent reads the ledger (spec §4 "Every agent reads it")

The Harvest Scanner stops offering what the firm bought today and says so in Context. The Drift Monitor, the Client Letter agent and the Brief's Today read holdings and pending orders through the ledger, and the Drift Monitor's "after a full rebalance" counts the working orders as the proposal does. A guard keeps every named reader on the ledger.

**Files:**
- Modify: `src/mocks/agents/harvest-scanner.ts`, `src/mocks/agents/brief-topic.ts` (`bought_today`), `src/mocks/workspace/brief-groups.ts` (`briefGroupOf`, `briefLine`), `src/mocks/agents/drift-monitor.ts`, `src/mocks/agents/client-letter.ts`, `src/mocks/workspace/brief-today.ts`
- Create: `src/mocks/agents/__tests__/one-ledger.test.ts`, `src/mocks/workspace/__tests__/harvest-after-fills.test.ts`

**Interfaces:**
- Consumes: `accountLedger`, `workingMovesOf` (Tasks 1, 3); `generateRebalanceProposal` with `workingOrders` (Task 3); `modelAboveTolerance(account, legs, working)` (Task 3).
- Produces: `BriefTopic` `{ kind: 'bought_today'; symbol: string; name: string }` (Context). `harvestOpportunities(account)` excludes a position bought in the account on the session day.

- [ ] **Step 1: Failing tests**

Create `src/mocks/workspace/__tests__/harvest-after-fills.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { sessionNow } from '@/mocks/data/workspace-store'
import { harvestOpportunities, runHarvestScanner } from '@/mocks/agents/harvest-scanner'
import { accountLedger } from '../household-ledger'
import { approvedStoryV3, release } from './story-fixture'

const robert = () => {
  const a = accounts.find((x) => x.id === 'acc-002')
  if (!a) throw new Error('acc-002')
  return a
}

describe("the Harvest Scanner reads the day's fills", () => {
  it('offers AGG for harvest before the release', () => {
    expect(harvestOpportunities(robert()).map((o) => o.position.symbol)).toContain('AGG')
  })
  it('does not offer what the firm bought today, and says it was bought today', () => {
    release(approvedStoryV3())
    expect(accountLedger('acc-002').fillsOnDay.some((f) => f.side === 'buy' && f.symbol === 'AGG')).toBe(true)
    expect(harvestOpportunities(robert()).map((o) => o.position.symbol)).not.toContain('AGG')
    const findings = runHarvestScanner({ asOf: sessionNow(), subject: { type: 'account', id: 'acc-002' } })
    expect(findings.find((f) => f.topic.kind === 'harvest_allowed' && f.topic.symbol === 'AGG')).toBeUndefined()
    expect(findings.find((f) => f.topic.kind === 'bought_today' && f.topic.symbol === 'AGG')).toMatchObject({
      attention: 'info',
      claim: 'iShares Core US Aggregate Bond ETF was bought today in this account; selling it at a loss now would undo that trade and the purchase would wash the loss, so it is not offered for harvest.',
      figures: [{ label: 'Bought today · AGG', unit: 'sh', source: 'ledger.fillsOnDay.quantity' }],
    })
  })
})
```

Create `src/mocks/agents/__tests__/one-ledger.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles } from '@/__tests__/guardrails/detectors'

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

/** The readers the spec names: each builds what it says about trades, fills and holdings from the household ledger. */
const READERS = [
  'src/mocks/agents/meeting-prep.ts', 'src/mocks/agents/harvest-scanner.ts', 'src/mocks/agents/drift-monitor.ts',
  'src/mocks/agents/pretrade-check.ts', 'src/mocks/agents/client-letter.ts', 'src/mocks/workspace/proposal-engine.ts',
  'src/mocks/workspace/meeting-agents.ts', 'src/mocks/workspace/brief-today.ts',
] as const
/** The ledger's raw parts: reading one directly would be a second account of the same book. */
const RAW = /\b(?:ledgerFills|recordedSales|bookOf)\b|\{[^}]*\borders\b[^}]*\}\s*from\s*'@\/mocks\/handlers\/oms'|store\(\)\.staged/
const LEDGER_IMPORT = /from '(?:@\/mocks\/workspace|\.)\/household-ledger'/

describe('one household ledger', () => {
  it.each(READERS)('%s reads it, and never its raw parts', (f) => {
    expect(read(f)).toMatch(LEDGER_IMPORT)
    expect(read(f)).not.toMatch(RAW)
  })
  it.each(listSourceFiles('src/mocks/agents'))('%s reads holdings through the ledger, not the position fixtures', (f) => {
    expect(read(f)).not.toMatch(/\bgetPositionsForAccount\b/)
    expect(read(f)).not.toMatch(RAW)
  })
})
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/harvest-after-fills.test.ts src/mocks/agents/__tests__/one-ledger.test.ts --testTimeout 30000`
Expected: FAIL: AGG is still offered after the release; `drift-monitor.ts`, `client-letter.ts`, `harvest-scanner.ts` and `brief-today.ts` do not import the ledger and still read `getPositionsForAccount` or `store().staged`. (`listSourceFiles(dir)` from `src/__tests__/guardrails/detectors.ts` lists a directory's source files, skipping `__tests__`.)

- [ ] **Step 2: The Harvest Scanner**

In `src/mocks/agents/brief-topic.ts`, add to `BriefTopic`:

```ts
  /** The firm bought this security in the account today: not offered for harvest. */
  | { kind: 'bought_today'; symbol: string; name: string }
```

In `src/mocks/workspace/brief-groups.ts`: `briefGroupOf` keeps `bought_today` in Context (it is not in the decide list); `briefLine` gains `case 'bought_today': return \`${topic.name} was bought today; not offered for harvest\``.

In `src/mocks/agents/harvest-scanner.ts`: drop `getPositionsForAccount`; import `accountLedger` from `@/mocks/workspace/household-ledger`.

```ts
/** Symbols the firm bought in the account on the session day: selling them at a loss now would undo the trade and wash the loss. */
const boughtToday = (accountId: string): Map<string, number> =>
  accountLedger(accountId).fillsOnDay.filter((f) => f.side === 'buy').reduce((m, f) => m.set(f.symbol, (m.get(f.symbol) ?? 0) + f.quantity), new Map<string, number>())
```

In `harvestOpportunities`: `const ledger = accountLedger(account.id)`, `const bought = boughtToday(account.id)`, read `ledger.positions` in place of `getPositionsForAccount(…)`, and filter `.filter((p) => p.symbol !== 'CASH' && !bought.has(p.symbol))`.

In `runHarvestScanner`, after the harvestable findings (inside the taxable branch):

```ts
    const positions = accountLedger(account.id).positions
    for (const [symbol, quantity] of boughtToday(account.id)) {
      const held = positions.find((p) => p.symbol === symbol)
      if (!held || held.gainLoss >= 0) continue
      findings.push({
        claim: `${claimNameOf(symbol, held.name)} was bought today in this account; selling it at a loss now would undo that trade and the purchase would wash the loss, so it is not offered for harvest.`,
        attention: 'info', citations: lotsCite, topic: { kind: 'bought_today', symbol, name: claimNameOf(symbol, held.name) },
        figures: [{ label: `Bought today · ${symbol}`, value: quantity, unit: 'sh', source: 'ledger.fillsOnDay.quantity' }],
      })
    }
```

The "No position in this account can be sold at a loss today." finding stays as it is.

- [ ] **Step 3: The Drift Monitor, the Client Letter agent and the Brief's Today**

`src/mocks/agents/drift-monitor.ts`: drop `getPositionsForAccount` and `generateRebalanceTrades`; import `accountLedger`, `workingMovesOf` and `generateRebalanceProposal`.

```ts
  const working = workingMovesOf(account.id)
  const gap = modelAboveTolerance(account, generateRebalanceProposal(account.id, true, undefined, undefined, { workingOrders: working }).legs, working)
  …
  const positions = accountLedger(account.id).positions
```

`src/mocks/agents/client-letter.ts`: replace each `getPositionsForAccount(x.id, x.totalValue)` with `accountLedger(x.id).positions` and import `accountLedger`.

`src/mocks/workspace/brief-today.ts`, `releaseLines`: replace `s.staged.some((o) => o.approvalActId === approval.actId && o.status === 'pending_compliance')` with

```ts
    const pending = accountLedger(proposal.accountId).openOrders.some((o) => o.source.kind === 'proposal' && o.source.proposalId === proposal.id && o.source.version === approval.version)
    if (!pending) return []
```

after the proposal lookup (the lookup moves up). Import `accountLedger` from `./household-ledger`.

Run: `pnpm vitest run src/mocks --testTimeout 30000`
Expected: PASS. A Brief test that counted Context items after the fills gains the AGG "bought today" line; update the count, and check that AGG has left Needs a decision.

- [ ] **Step 4: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/compliance-review.spec.ts
git status --short e2e-visual/__baselines__
```

Open `brief-after-fills-light.png`: AGG has left Needs a decision; Context has "iShares Core US Aggregate Bond ETF was bought today; not offered for harvest". Nothing else moves (the Brief before the fills has no fills to read). Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "fix(agents): every agent reads the household ledger; the Harvest Scanner no longer offers what the firm bought today

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Patricia's thread, View as Patricia, and the recap to both spouses (spec §4 "The recap goes to both spouses")

Patricia is a client in her own right. She gets her own client conversation, `th-patricia`. A recap drafted in Robert's conversation records a copy for each attending member who has her own conversation; sending it is one recorded act with two deliveries, the same letter in each thread. Compliance reviews each delivery. View as gains Patricia, who sees only her own conversation: the recap, with her decisions, and its record.

**Files:**
- Modify: `src/mocks/data/people.ts` (`PEOPLE`), `src/mocks/data/workspace-seed.ts` (`SEED_THREADS`, `PATRICIA_THREAD_ID`), `src/types/workspace.ts` (`Draft.copies`, `BindingAct.deliveries`, `Delivery`), `src/mocks/workspace/recap.ts`, `src/mocks/workspace/letters.ts` (`reviseDraft` keeps copies), `src/mocks/workspace/acts.ts` (`sendToParty`), `src/mocks/workspace/outsider-view.ts` (`actsReaching`, `anchorsOf`), `src/mocks/handlers/workspace.ts` (the acts GET), `src/mocks/handlers/workspace-http.ts` (`withoutProvenance`), `src/mocks/workspace/correspondence.ts` (`sentMessages`), `src/workspace/context/DraftsPanel.tsx`, `src/mocks/handlers/__tests__/outsider-routes.test.ts`, `src/mocks/workspace/__tests__/external-boundary.test.ts`, `e2e-visual/meeting-review.spec.ts`, `e2e-visual/readme-path.spec.ts`
- Create: `src/workspace/context/send-label.ts`, `src/mocks/workspace/__tests__/recap-deliveries.test.ts`, `src/workspace/__tests__/send-label.test.ts`

**Interfaces:**
- Consumes: `draftRecap`, `sendToParty`, `supervisionQueue`, `visibleThreads`; `joinWords`, `addressNameOf` (`src/lib/words.ts`).
- Produces:
  - `PATRICIA_THREAD_ID = 'th-patricia'` in `src/mocks/data/workspace-seed.ts`.
  - `type Delivery = { threadId: string; messageId: string }`; `BindingAct.deliveries?: Delivery[]` (firm only); `Draft.copies?: { threadId: string; partyName: string }[]` (firm only).
  - `actsReaching(threadId: string): BindingAct[]` in `outsider-view.ts`.
  - `sendLabelOf(partyName: string, draft: Pick<Draft, 'copies'>): string` in `src/workspace/context/send-label.ts`.

- [ ] **Step 1: Failing tests**

Create `src/mocks/workspace/__tests__/recap-deliveries.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { sendToParty } from '../acts'
import { supervisionQueue } from '../supervision'
import { visibleThreads } from '../visibility'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const PATRICIA = 'cli-002'

function recap() {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
  const fingerprint = meetingView(ADRIAN, 'evt-010')?.notesFingerprint
  if (!fingerprint) throw new Error('the notes have a fingerprint')
  ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
  return ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
}

async function asPatricia(path: string) {
  const res = await fetch(`/api/workspace${path}`, { headers: { 'X-Viewer': PATRICIA } })
  return { status: res.status, body: (await res.json()) as unknown }
}

describe('Patricia, a client in her own right', () => {
  it('has her own conversation, and sees only it', () => {
    expect(visibleThreads(PATRICIA).map((t) => t.id)).toEqual(['th-patricia'])
    expect(store().threads.find((t) => t.id === 'th-patricia')).toMatchObject({ visibility: 'client', partyId: PATRICIA, subject: { type: 'client', id: PATRICIA } })
  })
})

describe('the recap goes to both spouses', () => {
  it('records a copy for Patricia, who attended and has her own conversation', () => {
    expect(recap().copies).toEqual([{ threadId: 'th-patricia', partyName: 'Patricia Johnson' }])
  })

  it('is one recorded act with two deliveries: the same letter in each conversation', () => {
    const draft = recap()
    const { act } = ok(sendToParty(ADRIAN, draft.id))
    expect(store().acts.filter((a) => a.kind === 'send_to_party')).toHaveLength(1)
    expect(act.summary).toBe('Message sent to Robert Johnson and Patricia Johnson')
    expect(act.deliveries?.map((d) => d.threadId)).toEqual(['th-robert', 'th-patricia'])
    for (const d of act.deliveries ?? []) {
      expect(store().messages.find((m) => m.id === d.messageId)).toMatchObject({ kind: 'text', threadId: d.threadId, body: draft.body })
      expect(store().messages.some((m) => m.kind === 'act' && m.threadId === d.threadId && m.actId === act.id), d.threadId).toBe(true)
    }
  })

  it("carries Patricia's own decision to her", () => {
    const { act } = ok(sendToParty(ADRIAN, recap().id))
    const hers = store().messages.find((m) => m.id === act.deliveries?.[1]?.messageId)
    expect(hers?.kind === 'text' ? hers.body : '').toContain("We won't trade in Patricia's accounts until her risk profile and models are reviewed.")
  })

  it('puts each delivery in front of compliance', () => {
    ok(sendToParty(ADRIAN, recap().id))
    expect(supervisionQueue('cco-001')?.correspondence.map((c) => c.title)).toEqual(['Message to Robert Johnson', 'Message to Patricia Johnson'])
  })

  it('shows Patricia the record of what reached her, numbered as hers, with nothing of the firm', async () => {
    ok(sendToParty(ADRIAN, recap().id))
    const acts = await asPatricia('/acts?threadId=th-patricia')
    expect(acts.status).toBe(200)
    expect(acts.body).toEqual([expect.objectContaining({ id: '1', kind: 'send_to_party' })])
    expect(JSON.stringify(acts.body)).not.toMatch(/deliveries|th-robert|REC-\d{4}|fingerprint/)
    const thread = await asPatricia('/threads/th-patricia')
    expect(JSON.stringify(thread.body)).toContain('What we decided:')
    expect((await asPatricia('/threads/th-robert')).status).toBe(404)
  })
})
```

Create `src/workspace/__tests__/send-label.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sendLabelOf } from '@/workspace/context/send-label'

describe('sendLabelOf', () => {
  it('names the party, then each copy, as a button addresses them', () => {
    expect(sendLabelOf('Robert Johnson', {})).toBe('Send to Robert')
    expect(sendLabelOf('Robert Johnson', { copies: [{ threadId: 'th-patricia', partyName: 'Patricia Johnson' }] })).toBe('Send to Robert and Patricia')
    expect(sendLabelOf('Dr. Amanda Pell', {})).toBe('Send to Dr. Pell')
  })
})
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/recap-deliveries.test.ts src/workspace/__tests__/send-label.test.ts --testTimeout 30000`
Expected: FAIL (no `th-patricia`; no `copies`; the send module is missing).

- [ ] **Step 2: Patricia in the directory, with her own conversation**

In `src/mocks/data/people.ts`, `PEOPLE` gains `{ id: 'cli-002', name: 'Patricia Johnson', role: 'client' }` after Robert.

In `src/mocks/data/workspace-seed.ts`:

```ts
export const PATRICIA_THREAD_ID = 'th-patricia'
```

and in `SEED_THREADS`, after `th-robert`:

```ts
  { id: PATRICIA_THREAD_ID, title: 'Patricia Johnson', visibility: 'client', partyId: 'cli-002', memberIds: ['cli-002', 'user-001', 'user-002'],
    agentIds: [], subject: { type: 'client', id: 'cli-002' } },
```

- [ ] **Step 3: Copies and deliveries**

In `src/types/workspace.ts`:

```ts
/** Where a sent message landed: its thread and the message there. A recap to both spouses has two. Firm only. */
type Delivery = { threadId: string; messageId: string }
```

`BindingAct` gains `/** Firm only: every thread a send reached and its message there; the first is the act's own thread. */ deliveries?: Delivery[]`. `Draft` gains `/** Firm only: the other client conversations this letter also goes to when sent, as one act. */ copies?: { threadId: string; partyName: string }[]`.

In `src/mocks/workspace/recap.ts`, after `attending` is built:

```ts
  const copies = attending.slice(1).flatMap((c) => {
    const own = s.threads.find((t) => t.visibility === 'client' && t.partyId === c.id)
    return own ? [{ threadId: own.id, partyName: c.fullName }] : []
  })
```

and the draft carries `...(copies.length > 0 ? { copies } : {})`.

In `src/mocks/workspace/letters.ts`, `reviseDraft` keeps `...(old.copies ? { copies: old.copies } : {})`.

In `src/mocks/workspace/acts.ts`, `sendToParty`, replacing everything from `const at = nextAt()` to the `s.drafts = …` line:

```ts
  const copies = (draft.copies ?? []).map((c) => {
    const copy = s.threads.find((t) => t.id === c.threadId)
    if (!copy || copy.visibility !== 'client' || !canSeeThread(viewerId, copy)) throw new Error(`Draft ${draft.id} names a copy to ${c.threadId}, which is not a client conversation the sender can see`)
    return copy
  })
  const at = nextAt()
  const texts = [thread, ...copies].map((t): Message => ({ kind: 'text', id: nextId('msg'), threadId: t.id, authorId: viewerId, at, body: draft.body }))
  const deliveries = texts.map((m) => ({ threadId: m.threadId, messageId: m.id }))
  const parties = [party, ...copies.map(partyOfThread)]
  const [first] = deliveries
  if (!first) throw new Error(`Send of ${draft.id} delivered nothing`)
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_party', actorId: viewerId, at, threadId: thread.id,
    subject: { type: 'draft', id: draftId }, fingerprint: fingerprint(draft.body), messageId: first.messageId,
    summary: parties.length === 1 ? `Message sent to the ${party.kind}` : `Message sent to ${joinWords(parties.map((p) => p.name))}`,
    ...(deliveries.length > 1 ? { deliveries } : {}),
    ...(draft.agentId ? {
      ...(draft.basis ? { basis: draft.basis } : {}),
      ...(draft.recordBasis ? { recordBasis: draft.recordBasis } : {}),
      editedBy: draft.editorIds ?? [],
    } : {}),
  }
  const markers = deliveries.map((d): Message => ({ kind: 'act', id: nextId('msg'), threadId: d.threadId, at: nextAt(), actId: act.id }))
  s.acts.push(act)
  s.messages.push(...texts, ...markers)
  s.drafts = s.drafts.filter((d) => d.id !== draftId)
  return { ok: true, act }
```

(import `joinWords` from `@/lib/words`). A send with no copies is exactly as before: one text, one marker, no `deliveries`, the same summary.

In `src/mocks/workspace/outsider-view.ts`:

```ts
/** The acts that reached a thread: made in it, or delivered to it by a send that reached several. */
export function actsReaching(threadId: string): BindingAct[] {
  return store().acts.filter((a) => a.threadId === threadId || (a.deliveries ?? []).some((d) => d.threadId === threadId))
}
```

and `anchorsOf` reads `actsReaching(threadId).filter((a) => PARTY_VISIBLE_ACTS.has(a.kind))` in place of its own filter on `a.threadId`.

In `src/mocks/handlers/workspace.ts`, the `GET /api/workspace/acts` handler: `const acts = actsReaching(thread.id)`.

In `src/mocks/handlers/workspace-http.ts`, `withoutProvenance` also drops `deliveries: _deliveries`.

In `src/mocks/workspace/correspondence.ts`:

```ts
/** Every message the firm sent a client, one per delivery: a recap to both spouses is two messages for compliance to review. */
export function sentMessages(): SentMessage[] {
  const s = store()
  return s.acts.flatMap((act) => {
    if (act.kind !== 'send_to_party') return []
    const deliveries = act.deliveries ?? (act.messageId && act.threadId ? [{ threadId: act.threadId, messageId: act.messageId }] : [])
    return deliveries.flatMap((d) => {
      const message = s.messages.find((m): m is TextMessage => m.kind === 'text' && m.id === d.messageId)
      const thread = s.threads.find((t) => t.id === d.threadId)
      return message && thread ? [{ act, message, thread }] : []
    })
  })
}
```

- [ ] **Step 4: The button names both**

Create `src/workspace/context/send-label.ts`:

```ts
import { addressNameOf, joinWords } from '@/lib/words'
import type { Draft } from '@/types/workspace'

/** The send button, naming everyone the letter reaches as a button addresses them: "Send to Robert and Patricia". */
export const sendLabelOf = (partyName: string, draft: Pick<Draft, 'copies'>): string =>
  `Send to ${joinWords([partyName, ...(draft.copies ?? []).map((c) => c.partyName)].map(addressNameOf))}`
```

In `DraftsPanel.tsx`, `sendLabel={canSend ? sendLabelOf(party.name, d) : undefined}`; drop the `name` constant and the `addressNameOf` import if nothing else reads them.

- [ ] **Step 5: The boundary tests know Patricia**

- `src/mocks/handlers/__tests__/outsider-routes.test.ts`: `const PATRICIA = 'cli-002'`; `OWN` gains `[PATRICIA, { thread: 'th-patricia', client: PATRICIA }]`; `FIRM_ONLY_KEYS` gains `'deliveries'` and `'copies'`; the walk runs `it.each([ROBERT, PELL, PATRICIA])`.
- `src/mocks/workspace/__tests__/external-boundary.test.ts`: `isExternalViewer('cli-002')` is true; "each party sees only their own thread" gains `it("Patricia sees hers, not Robert's", () => { expect(visibleThreads('cli-002').map((t) => t.id)).toEqual(['th-patricia']); expect(canSeeThread('cli-002', thread('th-robert'))).toBe(false) })`; Robert's own case still reads `['th-robert']`.

Run: `pnpm vitest run src/mocks src/workspace/__tests__/send-label.test.ts --testTimeout 30000`
Expected: PASS. The roster test gains Patricia's thread only if it lists every client thread; the View-as tests list one more option, "Patricia Johnson · Client"; `WIDEST_OPTION` stays "Sarah Mitchell · Client service".

- [ ] **Step 6: The stories send to both, and Patricia's view**

- `e2e-visual/meeting-review.spec.ts` lines 95 and 230 and `e2e-visual/readme-path.spec.ts` line 87: the recap's button is `{ name: 'Send to Robert and Patricia' }`. (`shell.spec.ts:169` and `workspace-steps.ts:88` send a proposal letter, still "Send to Robert".)
- In `meeting-review.spec.ts`, add after `robertRecapClient`:

```ts
/** Patricia's own view once the recap is sent: the recap and its record, in her own conversation. */
const patriciaRecapClient = async (page: Page) => {
  await recapDrafted(page)
  await letterDraft(page).getByRole('button', { name: 'Send to Robert and Patricia' }).click()
  await expect(conversation(page)).toContainText('What we decided:')
  await viewAs(page, 'Patricia Johnson · Client')
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await page.getByRole('navigation', { name: 'Threads' }).getByRole('link').click()
  await expect(heading(page)).toHaveText('Your conversation with Larkfield')
  await expect(conversation(page).getByRole('listitem')).toHaveCount(2)
  await expect(conversation(page)).toContainText("We won't trade in Patricia's accounts")
  await settle(page)
}
```

and the scene `{ name: 'patricia-recap-client-light', layout: 'three-panes', open: patriciaRecapClient }`. In the end-to-end test of that spec, after the recap is sent, add `await expect(context(page).getByRole('region', { name: 'Audit trail' })).toContainText('Message sent to Robert Johnson and Patricia Johnson')`.

- [ ] **Step 7: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/phone.spec.ts e2e-visual/dialogs.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: Adrian's list has "Patricia Johnson" under Client conversations; `robert-recap-light`'s button reads "Send to Robert and Patricia"; `patricia-recap-client-light` shows her header (Larkfield Advisory, Patricia Johnson), one conversation, the recap and its record. Robert's own scenes do not move. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(clients): Patricia has her own conversation and View as; the recap reaches both spouses as one act with two deliveries

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 7: The household queue (spec §2; §5 "Unanswered client messages")

The engine derives the advisor's book: one row per household (name, managed value in USD, the reasons it needs the advisor today, and its markers), the queue (the rows with a reason, in tier order, oldest first within a tier) and every household A–Z. Firm only. It is derived on every read, so acts and clock jumps move it. This task is the engine alone; Task 8 serves it (route, service, hook) together with the column that reads it, so no route exists without its caller.

**Files:**
- Create: `src/types/workspace-book.ts`, `src/mocks/workspace/household-book.ts`, `src/mocks/workspace/__tests__/household-book.test.ts`

**Interfaces:**
- Consumes: `store`, `sessionNow`; `remeasureBrief` (`brief-remeasure.ts`), `settleApproved`, `BriefSummary` (`brief-groups.ts`), `suitablyApprovedAccounts` (`suitability.ts`); `activeApproval`, `releasedApproval`, `latestVersion`, `escalationOf`, `actOnApproval` (`src/mocks/data/proposals-store.ts`); `complianceAlerts` (`compliance.ts`), `alertContext`, `isOpenAlert` (`alerts.ts`); `calendarEvents`; `meetingOf`, `toUtc` (`meetings.ts`); `OPEN_ITEMS`; `documents`; `isFirmViewer`; `accountValueUSD` (`src/lib/aum.ts`); `computeDriftForAccount`; `isModelManaged`; `easternDayOf`.
- Produces (in `src/types/workspace-book.ts`):

```ts
export const QUEUE_TIERS = ['decision', 'client_waiting', 'meeting', 'compliance', 'task'] as const
export type QueueReason =
  | { kind: 'decision'; count: number; since: string }
  | { kind: 'client_waiting'; clientName: string; since: string; threadId: string }
  | { kind: 'meeting'; label: string; start: string; eventId: string }
  | { kind: 'compliance'; count: number; since: string }
  | { kind: 'task'; count: number; due: string; overdue: boolean }
export type HouseholdMarkers = { outOfBand: boolean; compliance: number; tasks: number }
export type HouseholdRow = { householdId: string; name: string; managedValue: number; reasons: QueueReason[]; markers: HouseholdMarkers }
export type HouseholdBook = { asOf: string; queue: HouseholdRow[]; households: HouseholdRow[] }
```

  and `householdBook(viewerId: string): HouseholdBook | undefined` in `src/mocks/workspace/household-book.ts`; inside it, `clientsWaiting(householdId: string)` (module-private here; Task 9 exports it).

- [ ] **Step 1: Failing test**

Create `src/mocks/workspace/__tests__/household-book.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { advanceClockTo } from '@/mocks/data/workspace-store'
import { minuteOf } from '@/lib/clock'
import { householdBook } from '../household-book'
import { holdMeeting, meetingView } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { sendToParty } from '../acts'
import { approvedStoryV3, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const book = () => {
  const b = householdBook(ADRIAN)
  if (!b) throw new Error('Adrian reads his book')
  return b
}
const rowOf = (id: string) => {
  const row = book().households.find((h) => h.householdId === id)
  if (!row) throw new Error(`no row for ${id}`)
  return row
}
const kinds = (id: string) => rowOf(id).reasons.map((r) => r.kind)

describe('the household queue', () => {
  it('ranks who needs the advisor today: a decision, then meetings in time order, then compliance oldest first', () => {
    expect(book().queue.map((h) => h.householdId)).toEqual(['hh-001', 'hh-006', 'hh-007', 'hh-005', 'hh-011'])
  })

  it("names the Johnsons' reasons in tier order: a decision, Robert waiting, the review, an open alert", () => {
    expect(rowOf('hh-001').reasons).toEqual([
      { kind: 'decision', count: 1, since: '2026-02-25T12:00:00Z' },
      { kind: 'client_waiting', clientName: 'Robert Johnson', since: '2026-02-25T12:01:00.000Z', threadId: 'th-robert' },
      { kind: 'meeting', label: 'review', start: '2026-02-25T19:00:00.000Z', eventId: 'evt-010' },
      { kind: 'compliance', count: 1, since: '2026-02-23T13:00:00Z' },
    ])
  })

  it('a household with nothing due is in the A–Z list and not in the queue, with no reasons', () => {
    expect(book().queue.some((h) => h.householdId === 'hh-008')).toBe(false)
    expect(rowOf('hh-008').reasons).toEqual([])
    expect(book().households.map((h) => h.name)).toEqual([...book().households.map((h) => h.name)].sort((a, b) => a.localeCompare(b)))
  })

  it("values each household in USD and marks out-of-band drift, open compliance items and open items", () => {
    // The five Johnson accounts as accounts.ts states them: 8,200,000 + 4,500,000 + 3,550,000 + 450,000 + 2,050,000.
    expect(rowOf('hh-001').managedValue).toBe(18_750_000)
    expect(rowOf('hh-001').markers).toEqual({ outOfBand: true, compliance: 1, tasks: 1 })
  })

  it("after the release, the Johnsons' decision drops off and the meeting remains", () => {
    release(approvedStoryV3())
    expect(kinds('hh-001')).toEqual(['client_waiting', 'meeting', 'compliance'])
  })

  it("after a jump to Thursday, Wednesday's meetings are not today's", () => {
    advanceClockTo(minuteOf('2026-02-26T14:10:00Z'))
    expect(book().households.flatMap((h) => h.reasons).filter((r) => r.kind === 'meeting' && r.start.startsWith('2026-02-25'))).toEqual([])
  })

  it("Patricia waiting after she writes; answered by the recap's delivery to her thread", async () => {
    const res = await fetch('/api/workspace/threads/th-patricia/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Viewer': 'cli-002' }, body: JSON.stringify({ body: 'Will the review cover my accounts too?' }),
    })
    expect(res.status).toBe(201)
    expect(rowOf('hh-001').reasons.filter((r) => r.kind === 'client_waiting').map((r) => r.kind === 'client_waiting' && r.clientName)).toEqual(['Robert Johnson', 'Patricia Johnson'])
    ok(holdMeeting(ADRIAN, 'evt-010'))
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    const fingerprint = meetingView(ADRIAN, 'evt-010')?.notesFingerprint
    if (!fingerprint) throw new Error('the notes have a fingerprint')
    ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
    ok(sendToParty(ADRIAN, ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.id))
    expect(kinds('hh-001')).not.toContain('client_waiting')
  })

  it('is firm only', () => {
    expect(householdBook('cli-001')).toBeUndefined()
    expect(householdBook('cli-002')).toBeUndefined()
    expect(householdBook('prsp-011')).toBeUndefined()
  })
})
```

The queue at the start of the session, as the fixtures read: the Johnsons (a suitability reason due); Anderson (its 10:00 ET quarterly review, and the open wire alert `comp-001`) and Patel (13:00 ET planning meeting), the meetings in time order; then Thompson (`comp-007`, raised 2 Feb) and Foster (`comp-003`, 20 Feb), the compliance items oldest first. Thursday's and later meetings are not today's. If the engine's first ordering differs, print it and report before changing anything.

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-book.test.ts --testTimeout 30000`
Expected: FAIL with "Failed to resolve import '../household-book'".

- [ ] **Step 2: The book's types**

Create `src/types/workspace-book.ts` with the block under **Produces**, each type documented:

```ts
/** Why a household needs the advisor today, in the order the queue ranks them. */
export const QUEUE_TIERS = ['decision', 'client_waiting', 'meeting', 'compliance', 'task'] as const
/**
 * One reason, as data the UI words: decisions waiting (unapproved proposals, suitability reasons due) since the
 * oldest; a client waiting for a reply since their first unanswered message; a meeting today still to hold; open
 * compliance items since the oldest; tasks due today or overdue, by the earliest due date.
 */
export type QueueReason =
  | { kind: 'decision'; count: number; since: string }
  | { kind: 'client_waiting'; clientName: string; since: string; threadId: string }
  | { kind: 'meeting'; label: string; start: string; eventId: string }
  | { kind: 'compliance'; count: number; since: string }
  | { kind: 'task'; count: number; due: string; overdue: boolean }
/** Small text markers: any model account outside its band, open compliance items, open tasks and items. */
export type HouseholdMarkers = { outOfBand: boolean; compliance: number; tasks: number }
/** `managedValue` is in USD. `reasons` is empty for a household with nothing due today. */
export type HouseholdRow = { householdId: string; name: string; managedValue: number; reasons: QueueReason[]; markers: HouseholdMarkers }
/** The advisor's book: the queue (rows with a reason, ranked) and every household A–Z. */
export type HouseholdBook = { asOf: string; queue: HouseholdRow[]; households: HouseholdRow[] }
```

- [ ] **Step 3: The derivation**

Create `src/mocks/workspace/household-book.ts`:

```ts
import type { Message } from '@/types/workspace'
import { QUEUE_TIERS, type HouseholdBook, type HouseholdMarkers, type HouseholdRow, type QueueReason } from '@/types/workspace-book'
import { accounts } from '@/mocks/data/accounts'
import { calendarEvents } from '@/mocks/data/calendar'
import { documents } from '@/mocks/data/documents'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { householdFixtures } from '@/mocks/data/households'
import { OPEN_ITEMS } from '@/mocks/data/open-items'
import { actOnApproval, activeApproval, escalationOf, latestVersion, releasedApproval } from '@/mocks/data/proposals-store'
import { sessionNow, store } from '@/mocks/data/workspace-store'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { accountValueUSD } from '@/lib/aum'
import { easternDayOf } from '@/lib/eastern-day'
import { isModelManaged } from '@/lib/mandate'
import { alertContext, isOpenAlert } from './alerts'
import { BRIEF_THREAD_ID } from './brief'
import { remeasureBrief } from './brief-remeasure'
import { settleApproved, type BriefSummary } from './brief-groups'
import { meetingOf, toUtc } from './meetings'
import { suitablyApprovedAccounts } from './suitability'
import { isFirmViewer } from './visibility'

type TextMessage = Extract<Message, { kind: 'text' }>
const byAt = (a: { at: string }, b: { at: string }) => a.at.localeCompare(b.at)
const oldest = (instants: readonly string[]): string => {
  const first = [...instants].sort()[0]
  if (first === undefined) throw new Error('No instant to take the oldest of')
  return first
}

function householdOf(householdId: string) {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household) throw new Error(`No household ${householdId}`)
  return household
}

/** The Brief's summary as it reads now: re-measured if the book moved, suitability settled by recorded approvals. */
function briefSummaryNow(): BriefSummary {
  remeasureBrief()
  const summary = store().messages.filter((m): m is BriefSummary => m.kind === 'brief_summary' && m.threadId === BRIEF_THREAD_ID).sort(byAt).pop()
  if (!summary) throw new Error('The Brief has no summary')
  return settleApproved(summary, suitablyApprovedAccounts())
}

/** Unapproved proposals on the household's accounts, and suitability reasons the Brief still waits for. */
function decision(accountIds: ReadonlySet<string>, summary: BriefSummary): QueueReason[] {
  const proposals = store().proposals.filter((p) => accountIds.has(p.accountId) && !activeApproval(p.id) && !releasedApproval(p.id))
  const reasonsDue = summary.decide.filter((i) => i.awaitsApprovalOf !== undefined && accountIds.has(i.awaitsApprovalOf))
  const since = [...proposals.map((p) => latestVersion(p).createdAt), ...reasonsDue.map(() => summary.at)]
  return since.length === 0 ? [] : [{ kind: 'decision', count: proposals.length + reasonsDue.length, since: oldest(since) }]
}

/** Since when a client has waited: their first message after the firm's last reply in their own conversation. */
function clientsWaiting(householdId: string): Extract<QueueReason, { kind: 'client_waiting' }>[] {
  return householdOf(householdId).members.flatMap((member) => store().threads
    .filter((t) => t.visibility === 'client' && t.partyId === member.clientId)
    .flatMap((t) => {
      const texts = store().messages.filter((m): m is TextMessage => m.kind === 'text' && m.threadId === t.id).sort(byAt)
      const lastReply = texts.map((m) => isFirmViewer(m.authorId)).lastIndexOf(true)
      const first = texts.slice(lastReply + 1).find((m) => m.authorId === member.clientId)
      return first ? [{ kind: 'client_waiting' as const, clientName: member.name, since: first.at, threadId: t.id }] : []
    }))
    .sort((a, b) => a.since.localeCompare(b.since))
}

const MEETING_LABEL: Readonly<Record<string, string>> = { annual_review: 'review', quarterly_review: 'quarterly review', planning: 'planning meeting' }

type MeetingReason = Extract<QueueReason, { kind: 'meeting' }>

/** Meetings with the household on the session day still to hold: a workspace meeting not yet held, or a calendar entry not yet over. */
function meetingsToday(householdId: string, day: string, now: string): MeetingReason[] {
  return calendarEvents.filter((e) => e.householdId === householdId && easternDayOf(toUtc(e.startTime)) === day).flatMap((e): MeetingReason[] => {
    const meeting = meetingOf(e.id)
    const pending = meeting ? meeting.state === 'scheduled' : Date.parse(toUtc(e.endTime)) > Date.parse(now)
    return pending ? [{ kind: 'meeting', label: MEETING_LABEL[e.meetingType] ?? 'meeting', start: toUtc(e.startTime), eventId: e.id }] : []
  }).sort((a, b) => a.start.localeCompare(b.start))
}

/** Open alerts about the household's accounts or clients, and its orders compliance returned or escalated. */
function complianceSince(accountIds: ReadonlySet<string>, clientIds: ReadonlySet<string>): string[] {
  const alerts = complianceAlerts.filter(isOpenAlert).filter((a) => {
    const c = alertContext(a)
    return (c.accountId !== undefined && accountIds.has(c.accountId)) || (c.clientId !== undefined && clientIds.has(c.clientId))
  }).map((a) => a.createdAt)
  const s = store()
  const held = s.proposals.filter((p) => accountIds.has(p.accountId)).flatMap((p) => {
    const approvals = s.approvals.filter((a) => a.proposalId === p.id)
    const returned = approvals.filter((a) => a.status === 'returned' && !activeApproval(p.id)).flatMap((a) => actOnApproval('return_to_advisor', a.actId)?.at ?? [])
    const active = activeApproval(p.id)
    const escalated = active ? escalationOf(active.actId)?.at : undefined
    return [...returned, ...(escalated ? [escalated] : [])]
  })
  return [...alerts, ...held]
}

/** The household's open follow-up tasks from filed meetings. */
const openTasks = (householdId: string) => store().meetings.filter((m) => m.householdId === householdId).flatMap((m) => m.tasks).filter((t) => t.state === 'open')

function tasksDue(householdId: string, day: string): QueueReason[] {
  const due = openTasks(householdId).filter((t) => t.due <= day)
  if (due.length === 0) return []
  const first = [...due].sort((a, b) => a.due.localeCompare(b.due))[0]
  if (!first) throw new Error('Tasks due with no first')
  return [{ kind: 'task', count: due.length, due: first.due, overdue: due.some((t) => t.due < day) }]
}

function markersOf(householdId: string, complianceCount: number): HouseholdMarkers {
  const own = accounts.filter((a) => a.householdId === householdId)
  const members = new Set(householdOf(householdId).members.map((m) => m.clientId))
  const items = OPEN_ITEMS.filter((i) => i.householdId === householdId).length
    + documents.filter((d) => members.has(d.clientId) && d.signatureStatus === 'pending').length
  return {
    outOfBand: own.filter(isModelManaged).some((a) => computeDriftForAccount(a).needsRebalance),
    compliance: complianceCount,
    tasks: openTasks(householdId).length + items,
  }
}

const tierOf = (r: QueueReason) => QUEUE_TIERS.indexOf(r.kind)
/** The instant a reason is ordered by within its tier: how long it has waited, or when it falls. */
const ageOf = (r: QueueReason): string => (r.kind === 'meeting' ? r.start : r.kind === 'task' ? r.due : r.since)

function householdRow(householdId: string, summary: BriefSummary): HouseholdRow {
  const household = householdOf(householdId)
  const own = accounts.filter((a) => a.householdId === householdId)
  const accountIds = new Set(own.map((a) => a.id))
  const clientIds = new Set(household.members.map((m) => m.clientId))
  const now = sessionNow()
  const day = easternDayOf(now)
  const compliance = complianceSince(accountIds, clientIds)
  const reasons: QueueReason[] = [
    ...decision(accountIds, summary),
    ...clientsWaiting(householdId),
    ...meetingsToday(householdId, day, now),
    ...(compliance.length > 0 ? [{ kind: 'compliance' as const, count: compliance.length, since: oldest(compliance) }] : []),
    ...tasksDue(householdId, day),
  ]
  return {
    householdId, name: household.name, managedValue: own.reduce((s, a) => s + accountValueUSD(a, FX_RATES_USD_BASE), 0),
    reasons, markers: markersOf(householdId, compliance.length),
  }
}

/** The advisor's book as a firm viewer reads it. A client, a prospect or anyone unknown gets nothing. */
export function householdBook(viewerId: string): HouseholdBook | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const summary = briefSummaryNow()
  const households = householdFixtures.map((h) => householdRow(h.id, summary)).sort((a, b) => a.name.localeCompare(b.name))
  const queue = households.filter((h) => h.reasons.length > 0).sort((a, b) => {
    const [ra, rb] = [a.reasons[0], b.reasons[0]]
    if (!ra || !rb) throw new Error('A queued household has no reason')
    return tierOf(ra) - tierOf(rb) || ageOf(ra).localeCompare(ageOf(rb)) || a.name.localeCompare(b.name)
  })
  return { asOf: sessionNow(), queue, households }
}
```

If `accountValueUSD` takes a narrower type than `Account`, pass the account as is (it accepts the fixture's fields).

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-book.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 4: Every check, commit**

Run the end-of-task checks. Baselines: none move. knip counts the test's import of `householdBook` as a use (Vitest test files are knip entries here). `clientsWaiting` stays module-private in this task; Task 9 exports it when the household page reads it.

```bash
git add src/types/workspace-book.ts src/mocks/workspace/household-book.ts src/mocks/workspace/__tests__/household-book.test.ts
git commit -m "feat(book): the household queue, derived by the engine: decisions, clients waiting, meetings, compliance, tasks; every household A to Z

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 8: The left column's two modes (spec §1; §2 "Each entry")

For a firm viewer the left column becomes the **Book**: a segmented control (Households · Conversations) heads it, Households opens first with the queue then every household A–Z, Conversations shows the Phase 9 thread groups, and the Firm and Reports links follow either mode. Each viewer's mode is remembered in localStorage. Clients and prospects see their one conversation, as today, under **Threads**, with no switch. On a phone, the list tab is the same column. The engine's book is served here with its column, so the route, the service and the hook land with their caller.

**Files:**
- Create: `src/kit/segmented/SegmentedControl.tsx`, `src/kit/__tests__/SegmentedControl.test.tsx`
- Create: `src/workspace/shell/book-mode.ts`, `src/workspace/shell/use-book-mode.ts`, `src/workspace/shell/BookColumn.tsx`, `src/workspace/shell/HouseholdsColumn.tsx`, `src/workspace/shell/DeskLinks.tsx`, `src/workspace/book/queue-words.ts`
- Create: `src/workspace/__tests__/book-mode.test.ts`, `src/workspace/__tests__/queue-words.test.ts`, `src/workspace/__tests__/book-column.test.tsx`, `src/test/book-mode.ts`
- Modify: `src/kit/measure.ts` (`fmtWaited`), `src/kit/__tests__/measure.test.ts`, `src/app/pages/kit/KitSections.tsx`, `src/workspace/shell/WorkspaceShell.tsx`, `src/workspace/shell/ThreadList.tsx` (groups only; `DeskLinks` moves out), `src/workspace/shell/ThreadListSkeleton.tsx` (`mode`), `src/workspace/shell/phone-panes.ts` (`columnLabelOf`, `phonePaneWords`), `src/mocks/handlers/workspace-meetings.ts` (`GET /api/workspace/households`), `src/services/workspace.ts` (`getHouseholdBook`), `src/hooks/use-workspace.ts` (`useHouseholdBook`), the unit tests that name the thread list (`rg -ln "name: 'Threads'" src`), `e2e-visual/workspace-steps.ts` and every spec that clicks a thread link or names the list
- Visual: `e2e-visual/shell.spec.ts` (`households-light`, `households-dark`), `e2e-visual/phone.spec.ts` (`phone-households-light`)

**Interfaces:**
- Consumes: `householdBook` and the types in `src/types/workspace-book.ts` (Task 7); `isExternalViewerIn` (`directory-people.ts`); `Pane`, `Tag`, `LINK_TARGET`; `fmtMoney`, `fmtEasternTime`, `fmtQuantity`, `UNIT`.
- Produces:
  - `SegmentedControl<V extends string>({ label, options, value, onChange })` with `options: readonly { value: V; label: string }[]`.
  - `fmtWaited(since: string, now: string): string` ("45 min", "8h", "2d").
  - `type BookMode = 'households' | 'conversations'`, `BOOK_MODE_OPTIONS`, `readBookMode(viewerId): BookMode`, `storeBookMode(viewerId, mode): void`, `bookModeKey(viewerId): string` in `book-mode.ts`; `useBookMode(viewerId): [BookMode, (mode: BookMode) => void]`.
  - `reasonWords(reason: QueueReason, asOf: string): string`, `statusLineOf(row: HouseholdRow, asOf: string): string`, `markerWords(markers: HouseholdMarkers): string[]` in `src/workspace/book/queue-words.ts`.
  - `columnLabelOf(external: boolean): 'Book' | 'Threads'`, `phonePaneWords(external: boolean)`; `PHONE_PANE_WORDS` is removed.
  - `getHouseholdBook(viewer)`, `useHouseholdBook()` (query key `['workspace', viewerId, 'households']`).
  - Test helper `showConversationsFor(viewerId = 'user-001'): void` (`src/test/book-mode.ts`).
  - e2e helpers in `workspace-steps.ts`: `bookColumn(page)`, `showConversations(page)`, `openThread(page, name)`; `threadLink` is removed.

- [ ] **Step 1: The kit's two pieces, failing**

Add to `src/kit/__tests__/measure.test.ts`:

```ts
describe('fmtWaited', () => {
  it('says how long, in the largest whole unit', () => {
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-25T12:46:00Z')).toBe('45 min')
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-25T20:30:00Z')).toBe('8h')
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-27T12:30:00Z')).toBe('2d')
    expect(fmtWaited('2026-02-25T12:01:00Z', '2026-02-25T12:01:00Z')).toBe('0 min')
  })
  it('refuses a wait that ends before it starts, and a bare date', () => {
    expect(() => fmtWaited('2026-02-25T13:00:00Z', '2026-02-25T12:00:00Z')).toThrow('2026-02-25T13:00:00Z is after 2026-02-25T12:00:00Z')
    expect(() => fmtWaited('2026-02-25', '2026-02-25T12:00:00Z')).toThrow(MeasureError)
  })
})
```

Create `src/kit/__tests__/SegmentedControl.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from '@/kit/segmented/SegmentedControl'

const OPTIONS = [{ value: 'households', label: 'Households' }, { value: 'conversations', label: 'Conversations' }] as const

describe('SegmentedControl', () => {
  it('is a named group of buttons, the shown one pressed', () => {
    render(<SegmentedControl label="Show" options={OPTIONS} value="households" onChange={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'Show' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Households' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Conversations' })).toHaveAttribute('aria-pressed', 'false')
  })
  it('is chosen with the keyboard: Tab reaches each, Enter and Space choose', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<SegmentedControl label="Show" options={OPTIONS} value="households" onChange={onChange} />)
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Conversations' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onChange.mock.calls).toEqual([['conversations'], ['conversations']])
  })
})
```

Run: `pnpm vitest run src/kit/__tests__/measure.test.ts src/kit/__tests__/SegmentedControl.test.tsx --testTimeout 30000`
Expected: FAIL ("fmtWaited is not exported", the control module is missing).

- [ ] **Step 2: The kit's two pieces**

In `src/kit/measure.ts`, after `fmtEasternWindow`:

```ts
/** How long someone has waited, from `since` to `now`, in the largest whole unit: "45 min", "8h", "2d". Both must be moments. */
export function fmtWaited(since: string, now: string): string {
  const minutes = Math.floor((parseInstant(now).getTime() - parseInstant(since).getTime()) / 60_000)
  if (minutes < 0) throw new MeasureError(`${since} is after ${now}`)
  if (minutes < 60) return `${fmtQuantity(minutes)} min`
  const hours = Math.floor(minutes / 60)
  return hours < 48 ? `${fmtQuantity(hours)}h` : `${fmtQuantity(Math.floor(hours / 24))}d`
}
```

Create `src/kit/segmented/SegmentedControl.tsx`:

```tsx
import { cn } from '@/lib/utils'

type SegmentedOption<V extends string> = { value: V; label: string }
type SegmentedControlProps<V extends string> = { label: string; options: readonly SegmentedOption<V>[]; value: V; onChange: (value: V) => void }

/**
 * One of a few views of the same thing: a named group of buttons, the shown one pressed. Each is a button, so Tab
 * reaches it and Enter or Space chooses it; the pressed state is said, and shown by weight and fill, not color alone.
 */
export function SegmentedControl<V extends string>({ label, options, value, onChange }: SegmentedControlProps<V>) {
  return (
    <div role="group" aria-label={label} className="flex w-full border border-ink">
      {options.map((o) => {
        const pressed = o.value === value
        return (
          <button key={o.value} type="button" aria-pressed={pressed} onClick={() => onChange(o.value)}
            className={cn('min-h-9 flex-1 px-3 text-body coarse:min-h-11', pressed ? 'bg-ink font-semibold text-face' : 'bg-bg text-ink hover:underline')}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
```

In `KitSections.tsx`, in the "Status codes and tags" pane, after the `RadioGroup`: `const [view, setView] = useState<'households' | 'conversations'>('households')` at the top of `KitSections`, and

```tsx
          <SegmentedControl label="Show" value={view} onChange={setView}
            options={[{ value: 'households', label: 'Households' }, { value: 'conversations', label: 'Conversations' }]} />
```

Run: `pnpm vitest run src/kit --testTimeout 30000`
Expected: PASS. (`src/__tests__/guardrails/contrast.test.ts` checks the token pair `bg-ink`/`text-face` the Tag's solid tone already uses.)

- [ ] **Step 3: The mode, its words, and the queue's words, failing**

Create `src/workspace/__tests__/book-mode.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { bookModeKey, readBookMode, storeBookMode } from '@/workspace/shell/book-mode'

describe('the book mode', () => {
  it('opens on Households', () => expect(readBookMode('user-001')).toBe('households'))
  it('each viewer keeps their own mode', () => {
    storeBookMode('user-001', 'conversations')
    expect(readBookMode('user-001')).toBe('conversations')
    expect(readBookMode('user-002')).toBe('households')
    expect(localStorage.getItem(bookModeKey('user-001'))).toBe('conversations')
  })
  it('a stored value it does not know opens on Households', () => {
    localStorage.setItem(bookModeKey('user-001'), 'threads')
    expect(readBookMode('user-001')).toBe('households')
  })
  it('blocked storage opens on Households and keeps nothing, without throwing', () => {
    const blocked = () => { throw new DOMException('blocked', 'SecurityError') }
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    expect(readBookMode('user-001')).toBe('households')
    expect(() => storeBookMode('user-001', 'conversations')).not.toThrow()
    get.mockRestore()
    set.mockRestore()
  })
  it('rethrows what is not a storage refusal', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new TypeError('broken') })
    expect(() => readBookMode('user-001')).toThrow('broken')
    get.mockRestore()
  })
})
```

Create `src/workspace/__tests__/queue-words.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { markerWords, reasonWords, statusLineOf } from '@/workspace/book/queue-words'
import type { HouseholdRow } from '@/types/workspace-book'

const AS_OF = '2026-02-25T20:15:00.000Z'
const johnson: HouseholdRow = {
  householdId: 'hh-001', name: 'Johnson Household', managedValue: 18_750_000, markers: { outOfBand: true, compliance: 1, tasks: 1 },
  reasons: [
    { kind: 'decision', count: 1, since: '2026-02-25T12:00:00Z' },
    { kind: 'client_waiting', clientName: 'Robert Johnson', since: '2026-02-25T12:01:00.000Z', threadId: 'th-robert' },
    { kind: 'meeting', label: 'review', start: '2026-02-25T19:00:00.000Z', eventId: 'evt-010' },
  ],
}

describe('the queue in words', () => {
  it("reads a household's reasons as one line", () => {
    expect(statusLineOf(johnson, AS_OF)).toBe('Decision waiting · Robert waiting 8h · review 14:00 ET')
  })
  it('counts several of a kind, and says when a task is overdue', () => {
    expect(reasonWords({ kind: 'decision', count: 2, since: AS_OF }, AS_OF)).toBe('2 decisions waiting')
    expect(reasonWords({ kind: 'compliance', count: 1, since: AS_OF }, AS_OF)).toBe('1 compliance item')
    expect(reasonWords({ kind: 'compliance', count: 3, since: AS_OF }, AS_OF)).toBe('3 compliance items')
    expect(reasonWords({ kind: 'task', count: 1, due: '2026-02-24', overdue: true }, AS_OF)).toBe('Task overdue')
    expect(reasonWords({ kind: 'task', count: 2, due: '2026-02-25', overdue: false }, AS_OF)).toBe('2 tasks due today')
  })
  it('a household with nothing due has no line and no markers', () => {
    const quiet: HouseholdRow = { ...johnson, reasons: [], markers: { outOfBand: false, compliance: 0, tasks: 0 } }
    expect(statusLineOf(quiet, AS_OF)).toBe('')
    expect(markerWords(quiet.markers)).toEqual([])
  })
  it('marks drift, compliance and open items in words, never by color alone', () => {
    expect(markerWords(johnson.markers)).toEqual(['OUT OF BAND', 'COMPLIANCE · 1', 'OPEN ITEMS · 1'])
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/book-mode.test.ts src/workspace/__tests__/queue-words.test.ts --testTimeout 30000`
Expected: FAIL (the modules are missing).

- [ ] **Step 4: The mode and the words**

Create `src/workspace/shell/book-mode.ts`:

```ts
/** What the firm's left column shows: the book of households, or the conversations. Households opens first. */
const BOOK_MODES = ['households', 'conversations'] as const
export type BookMode = (typeof BOOK_MODES)[number]

export const BOOK_MODE_OPTIONS: readonly { value: BookMode; label: string }[] = [
  { value: 'households', label: 'Households' }, { value: 'conversations', label: 'Conversations' },
]

const DEFAULT_MODE: BookMode = 'households'
const isBookMode = (value: unknown): value is BookMode => BOOK_MODES.some((m) => m === value)

/** Each viewer's own choice, kept in this browser. */
export const bookModeKey = (viewerId: string): string => `ws-book-mode:${viewerId}`

/** A browser that refuses storage (private mode, blocked site data) refuses with a DOMException; anything else is a bug. */
const isStorageRefusal = (error: unknown): error is DOMException => error instanceof DOMException

export function readBookMode(viewerId: string): BookMode {
  try {
    const stored = localStorage.getItem(bookModeKey(viewerId))
    return isBookMode(stored) ? stored : DEFAULT_MODE
  } catch (error) {
    if (isStorageRefusal(error)) return DEFAULT_MODE
    throw error
  }
}

/** Keeps the choice; where storage is refused, the choice lasts until the page is reloaded. */
export function storeBookMode(viewerId: string, mode: BookMode): void {
  try {
    localStorage.setItem(bookModeKey(viewerId), mode)
  } catch (error) {
    if (!isStorageRefusal(error)) throw error
  }
}
```

Create `src/workspace/shell/use-book-mode.ts`:

```ts
import { useCallback, useState } from 'react'
import { readBookMode, storeBookMode, type BookMode } from './book-mode'

/** The viewer's mode, read from their own stored choice; switching View as reads the new viewer's. */
export function useBookMode(viewerId: string): [BookMode, (mode: BookMode) => void] {
  const [chosen, setChosen] = useState<{ viewerId: string; mode: BookMode }>()
  const mode = chosen?.viewerId === viewerId ? chosen.mode : readBookMode(viewerId)
  const choose = useCallback((next: BookMode) => {
    storeBookMode(viewerId, next)
    setChosen({ viewerId, mode: next })
  }, [viewerId])
  return [mode, choose]
}
```

Create `src/workspace/book/queue-words.ts`:

```ts
import { fmtEasternTime, fmtQuantity, fmtWaited } from '@/kit/measure'
import { addressNameOf } from '@/lib/words'
import type { HouseholdMarkers, HouseholdRow, QueueReason } from '@/types/workspace-book'

const counted = (n: number, one: string, many: string) => `${fmtQuantity(n)} ${n === 1 ? one : many}`

/** One reason as the queue says it; every figure through the kit. */
export function reasonWords(reason: QueueReason, asOf: string): string {
  switch (reason.kind) {
    case 'decision': return reason.count === 1 ? 'Decision waiting' : `${counted(reason.count, 'decision', 'decisions')} waiting`
    case 'client_waiting': return `${addressNameOf(reason.clientName)} waiting ${fmtWaited(reason.since, asOf)}`
    case 'meeting': return `${reason.label} ${fmtEasternTime(reason.start)} ET`
    case 'compliance': return counted(reason.count, 'compliance item', 'compliance items')
    case 'task': return `${reason.count === 1 ? 'Task' : counted(reason.count, 'task', 'tasks')} ${reason.overdue ? 'overdue' : 'due today'}`
  }
}

/** Why a household is here today, in one line: "Decision waiting · Robert waiting 8h · review 14:00 ET". Empty when nothing is due. */
export const statusLineOf = (row: HouseholdRow, asOf: string): string => row.reasons.map((r) => reasonWords(r, asOf)).join(' · ')

/** The row's markers as words for tags. */
export function markerWords({ outOfBand, compliance, tasks }: HouseholdMarkers): string[] {
  return [
    ...(outOfBand ? ['OUT OF BAND'] : []),
    ...(compliance > 0 ? [`COMPLIANCE · ${fmtQuantity(compliance)}`] : []),
    ...(tasks > 0 ? [`OPEN ITEMS · ${fmtQuantity(tasks)}`] : []),
  ]
}
```

Run: `pnpm vitest run src/workspace/__tests__/book-mode.test.ts src/workspace/__tests__/queue-words.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 5: The book is served**

In `src/mocks/handlers/workspace-meetings.ts`, before the `:householdId` route (import `householdBook` from `../workspace/household-book`):

```ts
  http.get('/api/workspace/households', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const book = householdBook(viewer.viewerId)
    return book ? HttpResponse.json(book) : notFound()
  }),
```

In `src/services/workspace.ts`: `export const getHouseholdBook = (viewer: string) => get<HouseholdBook>('/workspace/households', undefined, as(viewer))`.

In `src/hooks/use-workspace.ts`:

```ts
/** The advisor's book: the queue and every household. Under the workspace prefix, so every act and clock jump re-reads it. */
export function useHouseholdBook() {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'households'], queryFn: () => api.getHouseholdBook(viewerId) })
}
```

- [ ] **Step 6: The column, failing**

Create `src/test/book-mode.ts`:

```ts
import { bookModeKey } from '@/workspace/shell/book-mode'

/** Opens the viewer's column on Conversations, for a test that reaches a thread through the list. */
export function showConversationsFor(viewerId = 'user-001'): void {
  localStorage.setItem(bookModeKey(viewerId), 'conversations')
}
```

Create `src/workspace/__tests__/book-column.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { bookModeKey } from '@/workspace/shell/book-mode'

const book = () => screen.getByRole('navigation', { name: 'Book' })

async function viewAs(option: string) {
  const user = userEvent.setup()
  await screen.findByRole('option', { name: option })
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), option)
}

describe('the Book', () => {
  it('opens on Households: the switch, the Brief, the queue, then every household', async () => {
    renderRoutes(routes, '/')
    const queue = await within(book()).findByRole('list', { name: 'Needs you today' })
    expect(within(book()).getByRole('button', { name: 'Households' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(book()).getByRole('link', { name: 'Brief' })).toHaveAttribute('href', '/t/th-brief')
    const first = within(queue).getAllByRole('link')[0]
    expect(first).toHaveAttribute('href', '/households/hh-001')
    expect(first).toHaveTextContent('Johnson Household')
    expect(first).toHaveTextContent('Decision waiting · Robert waiting')
    expect(first).toHaveTextContent('review 14:00 ET')
    expect(first).toHaveTextContent('OUT OF BAND')
    expect(within(book()).getByRole('list', { name: 'All households' })).toBeInTheDocument()
    expect(within(book()).getByRole('heading', { name: 'Firm' })).toBeInTheDocument()
  })

  it('a household with nothing due shows no status line and no markers', async () => {
    renderRoutes(routes, '/')
    const all = await within(book()).findByRole('list', { name: 'All households' })
    const obrien = within(all).getByRole('link', { name: /O'Brien Household/ })
    expect(obrien.querySelector('[data-part="status-line"]')).toBeNull()
    expect(obrien.querySelector('[data-tone]')).toBeNull()
  })

  it('switches to Conversations, remembered for this viewer only', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/')
    await user.click(await within(book()).findByRole('button', { name: 'Conversations' }))
    expect(await within(book()).findByRole('heading', { name: 'Just me' })).toBeInTheDocument()
    expect(localStorage.getItem(bookModeKey('user-001'))).toBe('conversations')
    await viewAs('Sarah Mitchell · Client service')
    expect(await within(book()).findByRole('list', { name: 'Needs you today' })).toBeInTheDocument()
    await viewAs('Adrian Hale · Advisor')
    expect(await within(book()).findByRole('heading', { name: 'Just me' })).toBeInTheDocument()
  })

  it('gives an outsider no switch: their one conversation, under Threads', async () => {
    renderRoutes(routes, '/')
    await viewAs('Robert Johnson · Client')
    const threads = await screen.findByRole('navigation', { name: 'Threads' })
    expect(within(threads).queryByRole('group', { name: 'Show' })).toBeNull()
    expect(await within(threads).findAllByRole('link')).toHaveLength(1)
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/book-column.test.tsx --testTimeout 30000`
Expected: FAIL (no navigation named "Book").

- [ ] **Step 7: The column**

Create `src/workspace/shell/DeskLinks.tsx` by moving `DESK`, `REFERENCE`, `DeskLinks` and `LinkPane` out of `ThreadList.tsx` unchanged (export `DeskLinks`).

`ThreadList.tsx` keeps the thread groups and `DeskAgents` (Task 12 moves the agents out) and no longer renders `DeskLinks`; its outer `div` keeps `flex flex-col gap-8`.

Create `src/workspace/shell/HouseholdsColumn.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtMoney } from '@/kit/measure'
import { cn } from '@/lib/utils'
import { useHouseholdBook } from '@/hooks/use-workspace'
import { householdFullViewHref } from '@/workspace/full-views/full-view-href'
import { markerWords, statusLineOf } from '@/workspace/book/queue-words'
import type { HouseholdRow } from '@/types/workspace-book'

const ROW = 'flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2 hover:bg-face'

/** Households mode: the day's Brief, who needs the advisor today, then every household A–Z. */
export function HouseholdsColumn() {
  const book = useHouseholdBook()
  return (
    <>
      <Pane title="Your day">
        <ul className="flex flex-col">
          <li>
            <NavLink to="/t/th-brief" className={({ isActive }) => cn(ROW, 'text-body', isActive ? 'border-ink bg-face font-semibold' : 'border-transparent')}>Brief</NavLink>
          </li>
        </ul>
      </Pane>
      {book.isPending ? <p role="status" className="text-body text-ink-3">Loading households…</p>
        : book.isError ? <p role="alert" className="text-body">{book.error.message}</p>
        : (
          <>
            <HouseholdList title="Needs you today" rows={book.data.queue} asOf={book.data.asOf} empty="No household needs you today." />
            <HouseholdList title="All households" rows={book.data.households} asOf={book.data.asOf} />
          </>
        )}
    </>
  )
}

function HouseholdList({ title, rows, asOf, empty }: { title: string; rows: HouseholdRow[]; asOf: string; empty?: string }) {
  return (
    <Pane title={title}>
      {rows.length === 0 && empty ? <p className="text-body text-ink-3">{empty}</p> : (
        <ul aria-label={title} className="flex flex-col">
          {rows.map((row) => <HouseholdRowLink key={row.householdId} row={row} asOf={asOf} />)}
        </ul>
      )}
    </Pane>
  )
}

function HouseholdRowLink({ row, asOf }: { row: HouseholdRow; asOf: string }) {
  const line = statusLineOf(row, asOf)
  const markers = markerWords(row.markers)
  return (
    <li>
      <NavLink to={householdFullViewHref(row.householdId)} className={({ isActive }) => cn(ROW, isActive ? 'border-ink bg-face' : 'border-transparent')}>
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-body">{row.name}</span>
          <span className="tabular text-label text-ink-3">{`${fmtMoney(row.managedValue)} ${UNIT.usd}`}</span>
        </span>
        {line ? <span data-part="status-line" className="text-label normal-case text-ink-2">{line}</span> : null}
        {markers.length > 0 ? <span className="flex flex-wrap gap-1.5">{markers.map((m) => <Tag key={m}>{m}</Tag>)}</span> : null}
      </NavLink>
    </li>
  )
}
```

Create `src/workspace/shell/BookColumn.tsx`:

```tsx
import { SegmentedControl } from '@/kit/segmented/SegmentedControl'
import { useDirectory } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { BOOK_MODE_OPTIONS } from './book-mode'
import { DeskLinks } from './DeskLinks'
import { HouseholdsColumn } from './HouseholdsColumn'
import { ThreadList } from './ThreadList'
import { ThreadListSkeleton } from './ThreadListSkeleton'
import { useBookMode } from './use-book-mode'

/** The left column. The firm's: a switch between the book of households and the conversations, then Firm and Reports. An outsider's: their one conversation. */
export function BookColumn() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const [mode, setMode] = useBookMode(viewerId)
  if (directory.isPending) return <ThreadListSkeleton mode={mode} />
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (isExternalViewerIn(directory.data, viewerId)) return <ThreadList />
  return (
    <div className="flex flex-col gap-8">
      <SegmentedControl label="Show" options={BOOK_MODE_OPTIONS} value={mode} onChange={setMode} />
      {mode === 'households' ? <HouseholdsColumn /> : <ThreadList />}
      <DeskLinks />
    </div>
  )
}
```

`ThreadListSkeleton.tsx` takes the mode and reserves the loaded column's panes in its order (the existing `SkeletonRows` and `BLANK_LINE` stay):

```tsx
import type { BookMode } from './book-mode'

type SkeletonPane = { title: string; rows: number; visibility?: Visibility }
const DESK_PANES: readonly SkeletonPane[] = [{ title: 'Firm', rows: 2 }, { title: 'Reports', rows: 6 }]
const MODE_PANES: Readonly<Record<BookMode, readonly SkeletonPane[]>> = {
  households: [{ title: 'Your day', rows: 1 }, { title: 'Needs you today', rows: 5 }, { title: 'All households', rows: 13 }],
  conversations: [
    { title: THREAD_GROUP_TITLE.private, rows: 1, visibility: 'private' },
    { title: THREAD_GROUP_TITLE.internal, rows: 3, visibility: 'internal' },
    { title: THREAD_GROUP_TITLE.client, rows: 3, visibility: 'client' },
  ],
}

/** The Book before it arrives, in the loaded column's order: the switch's height, then the same panes and row heights. */
export function ThreadListSkeleton({ mode }: { mode: BookMode }) {
  return (
    <>
      <p role="status" className="sr-only">Loading threads…</p>
      <div aria-hidden="true" data-part="thread-list-skeleton" className="flex flex-col gap-8">
        <div data-part="skeleton-switch" className="min-h-9 border border-transparent coarse:min-h-11" />
        {[...MODE_PANES[mode], ...DESK_PANES].map(({ title, rows, visibility }) => <Pane key={title} title={title}><SkeletonRows rows={rows} visibility={visibility} /></Pane>)}
      </div>
    </>
  )
}
```

`ThreadList` keeps rendering its own pending state for an outsider's list with `<ThreadListSkeleton mode="conversations" />`.

In `src/workspace/shell/phone-panes.ts`, replace `PHONE_PANE_WORDS` with:

```ts
/** The left column's name: the firm's Book, or an outsider's Threads. Its phone tab and jump key say the same. */
export const columnLabelOf = (external: boolean): 'Book' | 'Threads' => (external ? 'Threads' : 'Book')

export const phonePaneWords = (external: boolean): Readonly<Record<PhonePane, string>> =>
  ({ threads: columnLabelOf(external), thread: 'Thread', context: 'Context' })
```

In `WorkspaceShell.tsx`: read `useDirectory()` and `useViewer()`; `const external = directory.data !== undefined && isExternalViewerIn(directory.data, viewerId)`; the nav is `aria-label={columnLabelOf(external)}` and renders `<BookColumn />`; the pane bar reads `phonePaneWords(external)[p]`; the jump key for the list is labeled `external ? 'Thread list' : 'Book'`.

Run: `pnpm vitest run src/workspace/__tests__/book-column.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: The unit tests that walk the list**

`rg -ln "name: 'Threads'" src` lists ten test files. In each: a firm viewer's list is `{ name: 'Book' }`; an outsider's stays `'Threads'`. A test that clicks a thread link as a firm viewer calls `showConversationsFor()` (from `@/test/book-mode`) before rendering, or clicks the "Conversations" button first if the test is about the switch. `shell.test.tsx`'s skeleton case now delays `GET /api/workspace/people` (the Book waits for the directory; in Households mode it never asks for the threads) and pins the households skeleton: headings `['Your day', 'Needs you today', 'All households', 'Firm', 'Reports']` and 27 rows; its group-headings helper reads the Conversations mode after `showConversationsFor()`.

Run: `pnpm vitest run src/workspace src/app --testTimeout 30000`
Expected: PASS.

- [ ] **Step 9: The stories walk the Book**

In `e2e-visual/workspace-steps.ts`, replace `threadLink` with:

```ts
/** The firm's left column. An outsider's is still named Threads. */
export const bookColumn = (page: Page) => page.getByRole('navigation', { name: 'Book' })

/** Shows the conversations in the Book; once chosen, the choice holds for the rest of the session. */
export async function showConversations(page: Page) {
  const button = bookColumn(page).getByRole('button', { name: 'Conversations' })
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click()
  await expect(bookColumn(page).getByRole('heading', { name: 'Just me' })).toBeVisible()
}

/** Opens a conversation from the Book, as an advisor who has switched to Conversations would. */
export async function openThread(page: Page, name: string) {
  await showConversations(page)
  await bookColumn(page).getByRole('link', { name, exact: true }).click()
}
```

Every `threadLink(page, X).click()` becomes `openThread(page, X)`; the four non-click uses (`rebalance-job.spec.ts:200-201`, `reference-views.spec.ts:108`, `shell.spec.ts:181-182`) call `showConversations(page)` first and read `bookColumn(page).getByRole('link', { name, exact: true })`. `threadLink(page, 'Brief')` may stay a direct click in Households mode (`bookColumn(page).getByRole('link', { name: 'Brief', exact: true })`), since the Brief is in both modes; use `openThread` only when the next step needs Conversations. Every `getByRole('navigation', { name: 'Threads' })` for Adrian becomes `bookColumn(page)`; for Robert, Dr. Pell and Patricia it stays `'Threads'`. `deskLink` reads `bookColumn(page)`. In `meeting-review.spec.ts`, the beside-thread and full-width checks assert `bookColumn(page)` has count 0. In `phone.spec.ts`, the pane button and region named "Threads" are "Book" for Adrian.

New scenes:
- `shell.spec.ts`: `{ name: 'households-light', hasContext: false, open: households('light') }` and `households-dark`, where

```ts
const households = (theme: Theme) => async (page: Page) => {
  await visit(page, '/', theme)
  await expect(page.getByRole('navigation', { name: 'Book' }).getByRole('list', { name: 'Needs you today' })).toBeVisible()
  await settle(page)
}
```

- `phone.spec.ts`: `{ name: 'phone-households-light', open: async (page) => { await visitPhone(page, '/', 'light'); await expect(page.getByRole('navigation', { name: 'Book' }).getByRole('list', { name: 'Needs you today' })).toBeVisible(); await settle(page) } }`, and the phone story asserts the pane bar's first button reads "Book" for Adrian.

- [ ] **Step 10: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/phone.spec.ts e2e-visual/dialogs.spec.ts e2e-visual/kit.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: every list scene shows the Book in Households mode (the switch, Your day with the Brief, Needs you today with the Johnsons first and their line "Decision waiting · Robert waiting … · review 14:00 ET", All households A–Z, then Firm and Reports), text markers as outlined tags; the kit shows the segmented control. The three new scenes read the same in light and dark and on the phone with no sideways scroll. A scene listed under "Must not change" that moved is a bug: report it. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(shell): the Book opens on households, with the queue and every household; Conversations is one press away and remembered per viewer

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 9: The household page's read model (spec §3)

The engine's `householdView` gains what the rebuilt page shows, all from the household ledger: each member's standing (their own tolerance and their own accounts as a whole), holdings by asset class against the value-weighted household target with the accounts holding each class and the orders and fills that change it, the household's decisions, its tasks and open items with owner and due date, the last client contact and anyone waiting, and its conversations with their visibility words. Firm only, unchanged.

**Files:**
- Modify: `src/types/workspace-household.ts`, `src/mocks/workspace/household-views.ts`, `src/mocks/workspace/household-book.ts` (export `briefSummaryNow`, `clientsWaiting`, `openAlertsAbout`), `src/mocks/workspace/household-ledger.ts` (export the types `AccountLedger` and `HouseholdLedger`)
- Create: `src/mocks/workspace/__tests__/household-holdings.test.ts`, `src/mocks/workspace/__tests__/household-page-model.test.ts`

**Interfaces:**
- Consumes: `householdLedger`, `HouseholdLedger`, `AccountLedger` (Task 1); `clientRiskOf`; `bandFor`; `MODEL_DEFINITIONS`, `MODEL_BANDS`; `accountDisplayName`; `convertToBase`; `currencyForAccount`; `visibleThreads`; `audienceOf`; `clientComms`; `PEOPLE`, `AGENTS`, `personById`, `can`; `personWithRole`; `PRESENTER_ID` (`src/lib/presenter.ts`); `briefSummaryNow`, `clientsWaiting`, `openAlertsAbout` (household-book).
- Produces, in `src/types/workspace-household.ts`:

```ts
export type MemberStanding = {
  clientId: string; name: string
  tolerance: { band: string; floor: number; ceiling: number; score: number; assessedOn: string }
  /** The member's own accounts as a whole, against their own tolerance; absent when they hold no measured account. */
  whole?: { score: number; status: WholeStatus; value: number }
}
export type HoldingOrder =
  | { kind: 'working'; id: string; side: 'buy' | 'sell'; symbol: string; quantity: number; quantityUnit: 'sh' | 'contracts' | 'par'; limitPrice?: number }
  | { kind: 'pending_compliance'; id: string; side: 'buy' | 'sell'; symbol: string; quantity: number }
  | { kind: 'filled'; id: string; side: 'buy' | 'sell'; symbol: string; quantity: number; at: string }
export type ClassHolder =
  | { kind: 'managed'; accountId: string; name: string; ownerName: string; typeLabel: string; value: number; weightInAccount: number; orders: HoldingOrder[] }
  | { kind: 'held_away'; heldAwayId: string; name: string; ownerName: string; value: number; reportedOn: string }
export type AssetClassRow = {
  assetClass: AssetClass; value: number; weight: number; target: number; drift: number; band: number; withinBand: boolean
  holders: ClassHolder[]; openOrders: number; fillsToday: number
}
export type HouseholdHoldings = { managedValue: number; modelValue: number; rows: AssetClassRow[]; notInTarget: { accountId: string; name: string; value: number; mandateSummary: string }[] }
export type HouseholdDecision =
  | { kind: 'brief'; item: BriefItem; threadId: string }
  | { kind: 'proposal'; proposalId: string; title: string; latestVersion: number; threadId: string }
export type HouseholdTask = { id: string; title: string; owner: string; due?: string; overdue: boolean; source: 'meeting' | 'compliance' | 'open_item' | 'signature' }
export type LastContact = {
  clientName: string; at: string; direction: 'from_client' | 'to_client'
  where: { kind: 'conversation'; threadId: string; title: string } | { kind: 'crm'; channel: CommChannel; subject: string }
}
type ClientWaiting = { clientName: string; since: string; threadId: string }
export type HouseholdConversation = { threadId: string; title: string; visibility: Visibility; audience: ThreadAudience }
```

  and `HouseholdView` gains `standing: MemberStanding[]; holdings: HouseholdHoldings; decisions: HouseholdDecision[]; tasks: HouseholdTask[]; lastContact?: LastContact; waiting: ClientWaiting[]; conversations: HouseholdConversation[]; methods: MethodNote[]`. All values USD; times ISO instants.

- [ ] **Step 1: Failing tests**

Create `src/mocks/workspace/__tests__/household-holdings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { accountValueUSD } from '@/lib/aum'
import { householdView } from '../household-views'
import { approvedStoryV3, release } from './story-fixture'

const ADRIAN = 'user-001'
const view = (id: string) => {
  const v = householdView(ADRIAN, id)
  if (!v) throw new Error(`Adrian reads ${id}`)
  return v
}
const row = (id: string, assetClass: string) => {
  const r = view(id).holdings.rows.find((x) => x.assetClass === assetClass)
  if (!r) throw new Error(`${id} has no ${assetClass} row`)
  return r
}
const managedHolder = (id: string, assetClass: string, accountId: string) => {
  const h = row(id, assetClass).holders.find((x) => x.kind === 'managed' && x.accountId === accountId)
  if (!h || h.kind !== 'managed') throw new Error(`${accountId} holds no ${assetClass}`)
  return h
}
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0)

describe('holdings by asset class against the household target', () => {
  it('ties: the classes sum to the managed value, the targets to one, and each class to the accounts holding it', () => {
    const { holdings } = view('hh-001')
    expect(sum(holdings.rows.map((r) => r.value))).toBeCloseTo(holdings.modelValue, 0)
    expect(holdings.modelValue).toBeCloseTo(holdings.managedValue, 0)
    expect(sum(holdings.rows.map((r) => r.target))).toBeCloseTo(1, 9)
    for (const r of holdings.rows) {
      expect(sum(r.holders.flatMap((h) => (h.kind === 'managed' ? [h.value] : []))), r.assetClass).toBeCloseTo(r.value, 2)
      expect(r.drift, r.assetClass).toBeCloseTo(r.weight - r.target, 12)
      expect(r.withinBand, r.assetClass).toBe(Math.abs(r.drift) <= r.band)
    }
  })

  it("weights the target by each model account's value", () => {
    const own = accounts.filter((a) => a.householdId === 'hh-001')
    const { holdings } = view('hh-001')
    expect(holdings.modelValue).toBeCloseTo(sum(own.map((a) => accountValueUSD(a, FX_RATES_USD_BASE))), 0)
  })

  it('marks held-away plans as outside the firm\'s view and keeps them out of the totals', () => {
    const us = row('hh-001', 'us_equity')
    const away = us.holders.filter((h) => h.kind === 'held_away')
    expect(away.map((h) => h.kind === 'held_away' && h.heldAwayId)).toEqual(['ha-001', 'ha-002'])
    expect(away.map((h) => h.value)).toEqual([2_400_000 * 0.55, 1_500_000 * 0.40])
  })

  it('puts the working QQQ buy on the US equity it changes, in Robert Johnson · Individual (…3847)', () => {
    const h = managedHolder('hh-001', 'us_equity', 'acc-002')
    expect(h.name).toBe('Robert Johnson · Individual (…3847)')
    expect(h.orders).toContainEqual({ kind: 'working', id: 'ord-005', side: 'buy', symbol: 'QQQ', quantity: 200, quantityUnit: 'sh', limitPrice: 480 })
    expect(row('hh-001', 'us_equity').openOrders).toBe(2)
  })

  it("then the approved version's orders, pending compliance release, and after the release today's fills", () => {
    const approved = approvedStoryV3()
    expect(managedHolder('hh-001', 'us_equity', 'acc-002').orders).toContainEqual(expect.objectContaining({ kind: 'pending_compliance', side: 'sell', symbol: 'INTC', quantity: 7_000 }))
    release(approved)
    const filled = managedHolder('hh-001', 'us_equity', 'acc-002').orders.find((o) => o.kind === 'filled' && o.symbol === 'INTC')
    expect(filled).toMatchObject({ kind: 'filled', side: 'sell', quantity: 7_000 })
    expect(row('hh-001', 'fixed_income').fillsToday).toBeGreaterThan(0)
  })

  it("Chen-Wong's classes tie to its value in USD", () => {
    const { holdings } = view('hh-002')
    expect(sum(holdings.rows.map((r) => r.value))).toBeCloseTo(holdings.modelValue, 0)
    const own = accounts.filter((a) => a.householdId === 'hh-002' && a.mandate === 'model')
    expect(holdings.modelValue).toBeCloseTo(sum(own.map((a) => accountValueUSD(a, FX_RATES_USD_BASE))), -1)
  })

  it("Patel's custom mandate is outside the target, listed by name", () => {
    const { holdings } = view('hh-007')
    expect(holdings.notInTarget.map((a) => a.name)).toContain('Patel Digital Assets Account (…0912)')
    expect(holdings.managedValue).toBeGreaterThan(holdings.modelValue)
  })
})
```

Create `src/mocks/workspace/__tests__/household-page-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { householdView } from '../household-views'
import { approvedStoryV3, release } from './story-fixture'

const ADRIAN = 'user-001'
const johnson = () => {
  const v = householdView(ADRIAN, 'hh-001')
  if (!v) throw new Error('Adrian reads the Johnsons')
  return v
}

describe('the Johnson page model', () => {
  it("gives each member their own tolerance and their own accounts as a whole; nothing pooled", () => {
    expect(johnson().standing).toEqual([
      { clientId: 'cli-001', name: 'Robert Johnson', tolerance: { band: 'Moderate', floor: 41, ceiling: 55, score: 55, assessedOn: '2025-09-15' }, whole: expect.objectContaining({ score: 51, status: 'within' }) },
      { clientId: 'cli-002', name: 'Patricia Johnson', tolerance: { band: 'Moderate Conservative', floor: 26, ceiling: 40, score: 35, assessedOn: '2025-09-15' }, whole: expect.objectContaining({ score: 34, status: 'within' }) },
    ])
  })

  it("lists the Brief's decisions about the household's account, then none for the proposal once approved with a reason", () => {
    const before = johnson().decisions
    expect(before.every((d) => d.kind === 'brief')).toBe(true)
    expect(before.some((d) => d.kind === 'brief' && d.item.awaitsApprovalOf === 'acc-002')).toBe(true)
    release(approvedStoryV3())
    expect(johnson().decisions.some((d) => d.kind === 'brief' && d.item.awaitsApprovalOf === 'acc-002')).toBe(false)
    expect(johnson().decisions.some((d) => d.kind === 'proposal')).toBe(false)
  })

  it('names an owner for every task and open item, and a due date where there is one', () => {
    expect(johnson().tasks.map((t) => [t.id, t.owner, t.source, t.due])).toEqual([
      ['comp-002', 'Mark Davis · Compliance', 'compliance', undefined],
      ['oi-001', 'Adrian Hale · Advisor', 'open_item', undefined],
    ])
  })

  it('states the last client contact and who is waiting', () => {
    expect(johnson().lastContact).toEqual({
      clientName: 'Robert Johnson', at: '2026-02-25T12:01:00.000Z', direction: 'from_client', where: { kind: 'conversation', threadId: 'th-robert', title: 'Robert Johnson' },
    })
    expect(johnson().waiting).toEqual([{ clientName: 'Robert Johnson', since: '2026-02-25T12:01:00.000Z', threadId: 'th-robert' }])
  })

  it('lists its conversations with their visibility words, not the Brief', () => {
    expect(johnson().conversations.map((c) => [c.threadId, c.audience.kind])).toEqual([
      ['th-johnson-meeting', 'team'], ['th-johnson-review', 'team'], ['th-patricia', 'party'], ['th-robert', 'party'],
    ])
  })

  it('states its methods: the value-weighted target, held away outside the totals, suitability per client', () => {
    expect(johnson().methods.map((m) => m.label)).toEqual(['Household target', 'Held away', 'Orders and fills', 'Risk against tolerance'])
  })

  it('is firm only', () => {
    expect(householdView('cli-001', 'hh-001')).toBeUndefined()
    expect(householdView('cli-002', 'hh-001')).toBeUndefined()
  })
})
```

The standing figures (Robert 51, Patricia 34, both within) are the engine's reading at `55ab98b`; if they differ, report it rather than editing them.

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-holdings.test.ts src/mocks/workspace/__tests__/household-page-model.test.ts --testTimeout 30000`
Expected: FAIL (`holdings` and `standing` are undefined).

- [ ] **Step 2: The types**

Add the block under **Produces** to `src/types/workspace-household.ts` (type imports: `AssetClass` from `./portfolio`, `WholeStatus` from `./reference-risk`, `BriefItem`, `ThreadAudience`, `Visibility` from `./workspace`, `MethodNote` from `./reference`), and extend `HouseholdView`.

- [ ] **Step 3: What the book already knows, shared**

In `src/mocks/workspace/household-book.ts`: export `briefSummaryNow` and `clientsWaiting`, and extract the alert filter in `complianceSince` into

```ts
/** Open compliance alerts about the household's accounts or clients. */
export function openAlertsAbout(accountIds: ReadonlySet<string>, clientIds: ReadonlySet<string>): ComplianceAlert[] {
  return complianceAlerts.filter(isOpenAlert).filter((a) => {
    const c = alertContext(a)
    return (c.accountId !== undefined && accountIds.has(c.accountId)) || (c.clientId !== undefined && clientIds.has(c.clientId))
  })
}
```

which `complianceSince` now calls (`openAlertsAbout(accountIds, clientIds).map((a) => a.createdAt)`).

- [ ] **Step 4: The read model**

In `src/mocks/workspace/household-ledger.ts`, `AccountLedger` and `HouseholdLedger` become `export type` (this task imports them).

In `src/mocks/workspace/household-views.ts`, add (with the imports the code names):

```ts
const ADVISOR_OF_RECORD = PRESENTER_ID
const COMPLIANCE_OWNER = (() => {
  const cco = PEOPLE.find((p) => can(p.id, 'dispose_alert'))
  if (!cco) throw new Error('No one in the directory disposes of compliance alerts')
  return personWithRole(cco)
})()

const usd = (account: Account, value: number) => convertToBase(value, currencyForAccount(account.id), FX_RATES_USD_BASE)
const ledgerValue = (l: AccountLedger) => usd(l.account, l.positions.reduce((s, p) => s + p.marketValue, 0))

function modelOf(modelId: string) {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  const band = MODEL_BANDS[modelId]?.driftTolerance
  if (!model || band === undefined) throw new UnknownModelError(modelId)
  return { targets: model.assetClasses, band }
}

function standingOf(household: HouseholdFixture): MemberStanding[] {
  return household.members.map((m) => {
    const client = clients.find((c) => c.id === m.clientId)
    if (!client) throw new Error(`No client ${m.clientId}`)
    const band = bandFor(client.riskProfile.score)
    const tolerance = { band: band.label, floor: band.floor, ceiling: band.ceiling, score: client.riskProfile.score, assessedOn: client.riskProfile.lastAssessed }
    const risk = clientRiskOf(m.clientId)
    if (!risk) return { clientId: m.clientId, name: m.name, tolerance }
    const { score, status } = risk.posture
    if (status === 'glide_path') throw new Error(`${m.clientId}'s accounts as a whole carry a glide-path status`)
    return { clientId: m.clientId, name: m.name, tolerance, whole: { score, status, value: risk.value } }
  })
}

function holdingOrders(l: AccountLedger, assetClass: AssetClass): HoldingOrder[] {
  return [
    ...l.openOrders.filter((o) => o.assetClass === assetClass).map((o): HoldingOrder => (o.status === 'working'
      ? { kind: 'working', id: o.id, side: o.side, symbol: o.symbol, quantity: o.quantity, quantityUnit: o.quantityUnit, ...(o.limitPrice !== undefined ? { limitPrice: o.limitPrice } : {}) }
      : { kind: 'pending_compliance', id: o.id, side: o.side, symbol: o.symbol, quantity: o.quantity })),
    ...l.fillsOnDay.filter((f) => f.assetClass === assetClass).map((f): HoldingOrder => ({ kind: 'filled', id: f.id, side: f.side, symbol: f.symbol, quantity: f.quantity, at: f.at })),
  ]
}

/**
 * Holdings by asset class against the household target: the value-weighted model targets of its model-managed
 * accounts, in USD, with the same weighting of their bands. A custom mandate follows no model: it is listed outside the target.
 */
function holdingsOf(ledger: HouseholdLedger): HouseholdHoldings {
  const model = ledger.accounts.flatMap((l) => (isModelManaged(l.account) ? [{ l, account: l.account, ...modelOf(l.account.modelId) }] : []))
  const modelValue = model.reduce((s, m) => s + ledgerValue(m.l), 0)
  const classes = new Set<AssetClass>([...model.flatMap((m) => m.targets.map((t) => t.assetClass)), ...model.flatMap((m) => m.l.positions.map((p) => p.assetClass))])
  const rows = [...classes].map((assetClass): AssetClassRow => {
    const managed = model.flatMap(({ l, account }): ClassHolder[] => {
      const value = usd(account, l.positions.filter((p) => p.assetClass === assetClass).reduce((s, p) => s + p.marketValue, 0))
      const orders = holdingOrders(l, assetClass)
      return value > 0 || orders.length > 0
        ? [{ kind: 'managed', accountId: account.id, name: accountDisplayName(account), ownerName: clientName(account.clientId), typeLabel: ACCOUNT_TYPE_LABELS[account.type], value, weightInAccount: value / ledgerValue(l), orders }]
        : []
    })
    const away = ledger.heldAway.flatMap((h): ClassHolder[] => {
      const share = h.assetClasses.find((c) => c.assetClass === assetClass)?.percentage
      return share === undefined ? [] : [{ kind: 'held_away', heldAwayId: h.id, name: `${h.institutionName} ${h.accountType}`, ownerName: clientName(h.clientId), value: h.estimatedValue * share, reportedOn: h.lastUpdated }]
    })
    const value = managed.reduce((s, h) => s + h.value, 0)
    // A class a model does not name has a target of nothing in that model.
    const target = model.reduce((s, m) => s + (m.targets.find((t) => t.assetClass === assetClass)?.targetWeight ?? 0) * ledgerValue(m.l), 0) / modelValue
    const band = model.reduce((s, m) => s + m.band * ledgerValue(m.l), 0) / modelValue
    const weight = value / modelValue
    const orders = managed.flatMap((h) => (h.kind === 'managed' ? h.orders : []))
    return {
      assetClass, value, weight, target, drift: weight - target, band, withinBand: Math.abs(weight - target) <= band,
      holders: [...managed, ...away], openOrders: orders.filter((o) => o.kind !== 'filled').length, fillsToday: orders.filter((o) => o.kind === 'filled').length,
    }
  }).sort((a, b) => b.target - a.target || b.value - a.value)
  return {
    managedValue: ledger.accounts.reduce((s, l) => s + ledgerValue(l), 0), modelValue, rows,
    notInTarget: ledger.accounts.flatMap((l) => (l.account.mandate === 'custom'
      ? [{ accountId: l.account.id, name: accountDisplayName(l.account), value: ledgerValue(l), mandateSummary: l.account.mandateSummary }] : [])),
  }
}

function decisionsOf(accountIds: ReadonlySet<string>): HouseholdDecision[] {
  const s = store()
  const proposals = s.proposals.filter((p) => accountIds.has(p.accountId) && !activeApproval(p.id) && !releasedApproval(p.id))
    .map((p): HouseholdDecision => ({ kind: 'proposal', proposalId: p.id, title: p.title, latestVersion: latestVersion(p).n, threadId: p.threadId }))
  const subject = s.threads.find((t) => t.id === BRIEF_THREAD_ID)?.subject
  const brief = subject?.type === 'account' && accountIds.has(subject.id)
    ? briefSummaryNow().decide.map((item): HouseholdDecision => ({ kind: 'brief', item, threadId: BRIEF_THREAD_ID }))
    : []
  return [...proposals, ...brief]
}

function ownerName(owner: TaskOwner): string {
  if (owner.kind === 'agent') {
    const agent = AGENTS.find((a) => a.id === owner.agentId)
    if (!agent) throw new Error(`No agent ${owner.agentId}`)
    return agent.name
  }
  const person = personById(owner.personId)
  if (!person) throw new Error(`No person ${owner.personId}`)
  return personWithRole(person)
}

function tasksOf(household: HouseholdFixture, accountIds: ReadonlySet<string>, memberIds: ReadonlySet<string>, day: string): HouseholdTask[] {
  const advisor = personById(ADVISOR_OF_RECORD)
  if (!advisor) throw new Error('The advisor of record is not in the directory')
  return [
    ...store().meetings.filter((m) => m.householdId === household.id).flatMap((m) => m.tasks).filter((t) => t.state === 'open')
      .map((t): HouseholdTask => ({ id: t.id, title: t.title, owner: ownerName(t.owner), due: t.due, overdue: t.due < day, source: 'meeting' })),
    ...openAlertsAbout(accountIds, memberIds).map((a): HouseholdTask => ({ id: a.id, title: a.title, owner: COMPLIANCE_OWNER, overdue: false, source: 'compliance' })),
    ...OPEN_ITEMS.filter((i) => i.householdId === household.id).map((i): HouseholdTask => ({ id: i.id, title: i.text, owner: personWithRole(advisor), overdue: false, source: 'open_item' })),
    ...documents.filter((d) => memberIds.has(d.clientId) && d.signatureStatus === 'pending')
      .map((d): HouseholdTask => ({ id: d.id, title: `Awaiting signature: ${d.name}`, owner: clientName(d.clientId), overdue: false, source: 'signature' })),
  ]
}

function lastContactOf(memberIds: ReadonlySet<string>): LastContact | undefined {
  const s = store()
  const inThreads = s.threads.filter((t) => t.visibility === 'client').flatMap((t) => {
    const party = t.partyId
    if (party === undefined || !memberIds.has(party)) return []
    return s.messages.flatMap((m): LastContact[] => (m.kind === 'text' && m.threadId === t.id
      ? [{ clientName: clientName(party), at: m.at, direction: m.authorId === party ? 'from_client' : 'to_client', where: { kind: 'conversation', threadId: t.id, title: t.title } }]
      : []))
  })
  const crm = clientComms.filter((c) => memberIds.has(c.clientId)).map((c): LastContact => ({
    clientName: c.clientName, at: c.timestamp, direction: c.direction === 'inbound' ? 'from_client' : 'to_client', where: { kind: 'crm', channel: c.channel, subject: c.subject },
  }))
  return [...inThreads, ...crm].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]
}

const VISIBILITY_ORDER: readonly Visibility[] = ['private', 'internal', 'client']

function conversationsOf(viewerId: string, householdId: string, accountIds: ReadonlySet<string>, memberIds: ReadonlySet<string>): HouseholdConversation[] {
  const about = (s: Subject | undefined) => s !== undefined
    && ((s.type === 'household' && s.id === householdId) || (s.type === 'client' && memberIds.has(s.id)) || (s.type === 'account' && accountIds.has(s.id)))
  return visibleThreads(viewerId).filter((t) => t.id !== BRIEF_THREAD_ID && about(t.subject))
    .sort((a, b) => VISIBILITY_ORDER.indexOf(a.visibility) - VISIBILITY_ORDER.indexOf(b.visibility) || a.title.localeCompare(b.title))
    .map((t) => ({ threadId: t.id, title: t.title, visibility: t.visibility, audience: audienceOf(t) }))
}

const HOUSEHOLD_METHODS: readonly MethodNote[] = [
  { label: 'Household target', modeled: false, text: "The household target is the value-weighted average of the model targets of its model-managed accounts, in USD; its band is the same weighting of their models' drift bands. Each class's drift is its weight of those accounts against that target. A custom mandate follows no model and is listed outside the target." },
  { label: 'Held away', modeled: false, text: "Held-away accounts are shown inside each class at the client's last reported value and mix. They are outside the firm's view and not in the totals." },
  { label: 'Orders and fills', modeled: false, text: "Open orders are working order-management tickets and a proposal's orders pending compliance release. Fills are today's, in Eastern Time, against the holding they change." },
  { label: 'Risk against tolerance', modeled: true, text: "Each member is judged against their own questionnaire, on their own accounts as a whole: a value-weighted average of their accounts' risk scores, glide paths aside. Nothing is pooled across the household." },
]
```

and `householdView` returns, after the existing fields:

```ts
    standing: standingOf(household),
    holdings: holdingsOf(ledger),
    decisions: decisionsOf(accountIds),
    tasks: tasksOf(household, accountIds, memberIds, ledger.day),
    ...(lastContact ? { lastContact } : {}),
    waiting: clientsWaiting(household.id).map(({ clientName: name, since, threadId }) => ({ clientName: name, since, threadId })),
    conversations: conversationsOf(viewerId, household.id, accountIds, memberIds),
    methods: [...HOUSEHOLD_METHODS],
```

with `const ledger = householdLedger(household.id)`, `const accountIds = new Set(accounts.filter((a) => a.householdId === household.id).map((a) => a.id))` and `const lastContact = lastContactOf(memberIds)` computed before the return.

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-holdings.test.ts src/mocks/workspace/__tests__/household-page-model.test.ts src/mocks/workspace/__tests__/household-views.test.ts --testTimeout 30000`
Expected: PASS. If the decisions case finds no Brief item awaiting `acc-002` before the approval, the Brief's suitability item is not where Phase 9 left it: report it.

- [ ] **Step 5: Every check, commit**

Run the end-of-task checks. Baselines: none move (the page does not read the new fields until Task 10; `household-light` must not move).

```bash
git add src/types/workspace-household.ts src/mocks/workspace/household-views.ts src/mocks/workspace/household-book.ts src/mocks/workspace/__tests__/household-holdings.test.ts src/mocks/workspace/__tests__/household-page-model.test.ts
git commit -m "feat(household): the page's read model from the ledger: each member's standing, holdings by class against the household target, orders, decisions, tasks, contact, conversations

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 10: The household page as the main view (spec §3)

`/households/:id` is rebuilt around where the household stands: the header names each member with their own tolerance and their own accounts as a whole; holdings by asset class against the household target, each row opening onto the accounts that hold it with their open orders and today's fills; Needs a decision; Tasks and open items; Meetings; Last client contact. The existing accounts table, plan, windows, IPS, documents, communications and activity follow, then Methods. The list column stays visible beside it (the route no longer hides it); Task 11 adds the right column.

**Files:**
- Modify: `src/workspace/full-views/HouseholdView.tsx`, `src/app/routes.tsx` (the household route's handle), `src/workspace/__tests__/household-client-views.test.tsx`, `e2e-visual/meeting-review.spec.ts` (drop `household-light`)
- Create: `src/workspace/household/holding-words.ts`, `src/workspace/household/HouseholdStanding.tsx`, `src/workspace/household/AssetClassTable.tsx`, `src/workspace/household/HouseholdDecisions.tsx`, `src/workspace/household/HouseholdTasks.tsx`, `src/workspace/household/LastContactLine.tsx`, `src/workspace/__tests__/holding-words.test.ts`, `src/workspace/__tests__/household-page.test.tsx`, `e2e-visual/household.spec.ts`
- Delete: `e2e-visual/__baselines__/household-light.png`

**Interfaces:**
- Consumes: the `HouseholdView` fields of Task 9; `TOLERANCE_TAG` (`src/workspace/reference/reference-words.ts`); `MethodsAndSources`; `DataTable` with `onActivate` and `expandedRowId`; `Num`, `StatusCode`, `Tag`, `Reading`, `Pane`; `assetClassLabel`; `figureText`; `fmtWaited`, `fmtEasternStamp`, `fmtDayMonthYear`, `fmtMoney`, `fmtWeight`, `fmtDrift`, `fmtTolerance`, `fmtPoints`, `fmtQuantity`, `fmtPrice`.
- Produces: `holdingOrderWords(order: HoldingOrder, asOf: string): string`, `standingWords(member: MemberStanding): { tolerance: string; whole?: string }`, `ordersCellWords(row: AssetClassRow): string`, `contactWords(contact: LastContact, asOf: string): string` in `holding-words.ts`; the components named above.

- [ ] **Step 1: The words, failing**

Create `src/workspace/__tests__/holding-words.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { contactWords, holdingOrderWords, ordersCellWords, standingWords } from '@/workspace/household/holding-words'

const AS_OF = '2026-02-25T15:00:00.000Z'

describe('the household page in words', () => {
  it('says an order against the holding it changes', () => {
    expect(holdingOrderWords({ kind: 'working', id: 'ord-005', side: 'buy', symbol: 'QQQ', quantity: 200, quantityUnit: 'sh', limitPrice: 480 }, AS_OF)).toBe('working: buy 200 QQQ, limit 480.00')
    expect(holdingOrderWords({ kind: 'working', id: 'ord-016', side: 'buy', symbol: 'AAPLC185', quantity: 5, quantityUnit: 'contracts', limitPrice: 8.5 }, AS_OF)).toBe('working: buy 5 contracts AAPLC185, limit 8.50')
    expect(holdingOrderWords({ kind: 'pending_compliance', id: 'stg-0002', side: 'sell', symbol: 'SPY', quantity: 943 }, AS_OF)).toBe('pending compliance release: sell 943 SPY')
    expect(holdingOrderWords({ kind: 'filled', id: 'fill-0001', side: 'sell', symbol: 'INTC', quantity: 7_000, at: '2026-02-25T14:30:00.000Z' }, AS_OF)).toBe('filled 09:30 ET: sold 7,000 INTC')
  })
  it("says each member's own tolerance and accounts as a whole", () => {
    expect(standingWords({ clientId: 'cli-002', name: 'Patricia Johnson', tolerance: { band: 'Moderate Conservative', floor: 26, ceiling: 40, score: 35, assessedOn: '2025-09-15' }, whole: { score: 34, status: 'within', value: 2_500_000 } }))
      .toEqual({ tolerance: 'Moderate Conservative tolerance, 26–40 pts', whole: 'accounts as a whole 34 pts' })
    expect(standingWords({ clientId: 'cli-x', name: 'X', tolerance: { band: 'Moderate', floor: 41, ceiling: 55, score: 50, assessedOn: '2025-09-15' } }))
      .toEqual({ tolerance: 'Moderate tolerance, 41–55 pts' })
  })
  it("counts a class's orders", () => {
    expect(ordersCellWords({ openOrders: 2, fillsToday: 0 })).toBe('2 open')
    expect(ordersCellWords({ openOrders: 0, fillsToday: 3 })).toBe('3 filled today')
    expect(ordersCellWords({ openOrders: 1, fillsToday: 1 })).toBe('1 open · 1 filled today')
    expect(ordersCellWords({ openOrders: 0, fillsToday: 0 })).toBe('')
  })
  it('says who last spoke, when and where', () => {
    expect(contactWords({ clientName: 'Robert Johnson', at: '2026-02-25T12:01:00.000Z', direction: 'from_client', where: { kind: 'conversation', threadId: 'th-robert', title: 'Robert Johnson' } }, AS_OF))
      .toBe('Robert Johnson wrote at 07:01 ET, in their conversation')
    expect(contactWords({ clientName: 'Robert Johnson', at: '2026-02-24T17:30:00Z', direction: 'to_client', where: { kind: 'crm', channel: 'email', subject: 'Review agenda' } }, AS_OF))
      .toBe('To Robert Johnson, 24 Feb 12:30 ET, by email: Review agenda')
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/holding-words.test.ts --testTimeout 30000`
Expected: FAIL (module missing).

- [ ] **Step 2: The words**

Create `src/workspace/household/holding-words.ts`:

```ts
import { fmtEasternStamp, fmtPoints, fmtPrice, fmtQuantity } from '@/kit/measure'
import type { AssetClassRow, HoldingOrder, LastContact, MemberStanding } from '@/types/workspace-household'
import { CHANNEL_WORDS } from './household-words'

const unitWords = (unit: 'sh' | 'contracts' | 'par') => (unit === 'sh' ? '' : ` ${unit}`)

/** An order on the holding it changes: "working: buy 200 QQQ, limit 480.00", "pending compliance release: sell 943 SPY", "filled 09:30 ET: sold 7,000 INTC". */
export function holdingOrderWords(order: HoldingOrder, asOf: string): string {
  switch (order.kind) {
    case 'working': return `working: ${order.side} ${fmtQuantity(order.quantity)}${unitWords(order.quantityUnit)} ${order.symbol}${order.limitPrice !== undefined ? `, limit ${fmtPrice(order.limitPrice)}` : ''}`
    case 'pending_compliance': return `pending compliance release: ${order.side} ${fmtQuantity(order.quantity)} ${order.symbol}`
    case 'filled': return `filled ${fmtEasternStamp(order.at, asOf)}: ${order.side === 'buy' ? 'bought' : 'sold'} ${fmtQuantity(order.quantity)} ${order.symbol}`
  }
}

/** A member in their own right: their tolerance band, and their own accounts as a whole when measured. */
export function standingWords({ tolerance, whole }: MemberStanding): { tolerance: string; whole?: string } {
  const band = `${tolerance.band} tolerance, ${fmtPoints(tolerance.floor)}–${fmtPoints(tolerance.ceiling)} pts`
  return whole ? { tolerance: band, whole: `accounts as a whole ${fmtPoints(whole.score)} pts` } : { tolerance: band }
}

export function ordersCellWords({ openOrders, fillsToday }: Pick<AssetClassRow, 'openOrders' | 'fillsToday'>): string {
  return [...(openOrders > 0 ? [`${fmtQuantity(openOrders)} open`] : []), ...(fillsToday > 0 ? [`${fmtQuantity(fillsToday)} filled today`] : [])].join(' · ')
}

/** The last word between the firm and a client: who, when (Eastern), and where. */
export function contactWords({ clientName, at, direction, where }: LastContact, asOf: string): string {
  const when = fmtEasternStamp(at, asOf)
  if (where.kind === 'conversation') return direction === 'from_client' ? `${clientName} wrote at ${when}, in their conversation` : `The firm wrote to ${clientName} at ${when}, in their conversation`
  const how = `by ${CHANNEL_WORDS[where.channel].toLowerCase()}: ${where.subject}`
  return direction === 'from_client' ? `From ${clientName}, ${when}, ${how}` : `To ${clientName}, ${when}, ${how}`
}
```

Run: `pnpm vitest run src/workspace/__tests__/holding-words.test.ts --testTimeout 30000`
Expected: PASS. (`CHANNEL_WORDS.email` is "Email"; "In person" lowers to "in person".)

- [ ] **Step 3: The page, failing**

Create `src/workspace/__tests__/household-page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

const main = () => screen.getByRole('main')

describe('the Johnson household page', () => {
  it('names each member with their own tolerance and their own accounts as a whole', async () => {
    renderRoutes(routes, '/households/hh-001')
    const members = await within(main()).findByRole('list', { name: 'Members' })
    expect(members).toHaveTextContent('Robert Johnson')
    expect(members).toHaveTextContent('Moderate tolerance, 41–55 pts · accounts as a whole 51 pts')
    expect(members).toHaveTextContent('Moderate Conservative tolerance, 26–40 pts · accounts as a whole 34 pts')
    expect(within(members).getAllByText('WITHIN TOLERANCE')).toHaveLength(2)
    expect(main()).toHaveTextContent('Managed')
    expect(main()).toHaveTextContent('Held away')
  })

  it('shows holdings by asset class against the household target, and opens a class onto the accounts holding it', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    const table = await within(main()).findByRole('table', { name: 'Holdings by asset class' })
    expect(within(table).getByRole('columnheader', { name: /Target/ })).toBeInTheDocument()
    await user.click(within(table).getByRole('row', { name: /^US Equity/ }))
    const holders = within(main()).getByRole('region', { name: 'US Equity · accounts holding it' })
    expect(holders).toHaveTextContent('Robert Johnson · Individual (…3847)')
    expect(holders).toHaveTextContent('working: buy 200 QQQ, limit 480.00')
    expect(holders).toHaveTextContent("outside the firm's view")
  })

  it('lists what needs a decision, tasks with their owners, the meetings and the last client contact', async () => {
    renderRoutes(routes, '/households/hh-001')
    expect(await within(main()).findByRole('list', { name: 'Needs a decision' })).toHaveTextContent("Growth sits above Robert Johnson's Moderate tolerance")
    expect(within(main()).getByRole('list', { name: 'Tasks and open items' })).toHaveTextContent('Mark Davis · Compliance')
    expect(within(main()).getByRole('list', { name: 'Upcoming meetings' })).toHaveTextContent('14:00–15:15 ET')
    const contact = within(main()).getByRole('region', { name: 'Last client contact' })
    expect(contact).toHaveTextContent('Robert Johnson wrote at 07:01 ET, in their conversation')
    expect(contact).toHaveTextContent('Robert waiting')
  })

  it('is not found for an outsider', async () => {
    sessionStorage.setItem('ws-viewer', 'cli-002')
    renderRoutes(routes, '/households/hh-001')
    expect(await screen.findByRole('heading', { level: 1, name: /not found/i })).toBeInTheDocument()
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/household-page.test.tsx --testTimeout 30000`
Expected: FAIL (no list named "Members", no table "Holdings by asset class").

- [ ] **Step 4: The page**

Create `src/workspace/household/HouseholdStanding.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Tag } from '@/kit/tag/Tag'
import { LINK_TARGET } from '@/kit/link-target'
import { fmtDayMonthYear } from '@/kit/measure'
import { TOLERANCE_TAG } from '@/workspace/reference/reference-words'
import { clientFullViewHref } from '@/workspace/full-views/full-view-href'
import type { HouseholdView } from '@/types/workspace-household'
import { standingWords } from './holding-words'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** Each member, a client in their own right: their tolerance and their own accounts as a whole. Nothing pooled. */
export function HouseholdStanding({ view, from }: { view: Pick<HouseholdView, 'members' | 'standing'>; from: string | undefined }) {
  return (
    <ul aria-label="Members" className="flex flex-col gap-2">
      {view.standing.map((m) => {
        const words = standingWords(m)
        const born = view.members.find((x) => x.clientId === m.clientId)?.dateOfBirth
        return (
          <li key={m.clientId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link to={clientFullViewHref(m.clientId, from)} className={LINK}>{m.name}</Link>
            {born ? <span className="tabular text-body text-ink-3">{`born ${fmtDayMonthYear(born)}`}</span> : null}
            <span className="tabular text-body text-ink-2">{words.whole ? `${words.tolerance} · ${words.whole}` : `${words.tolerance} · no measured account`}</span>
            {m.whole ? <Tag tone={m.whole.status === 'above' ? 'solid' : 'outline'}>{TOLERANCE_TAG[m.whole.status]}</Tag> : null}
          </li>
        )
      })}
    </ul>
  )
}
```

Create `src/workspace/household/AssetClassTable.tsx`:

```tsx
import { useState } from 'react'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDayMonthYear, fmtDrift, fmtMoney, fmtTolerance, fmtWeight } from '@/kit/measure'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { AssetClassRow, HouseholdHoldings } from '@/types/workspace-household'
import { holdingOrderWords, ordersCellWords } from './holding-words'

/** The household's model-managed holdings by asset class against its target; a class opens onto the accounts holding it. */
export function AssetClassTable({ holdings, asOf }: { holdings: HouseholdHoldings; asOf: string }) {
  const [open, setOpen] = useState<string>()
  const expanded = holdings.rows.find((r) => r.assetClass === open)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <DataTable caption="Holdings by asset class" rows={holdings.rows} getRowId={(r) => r.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }}
        onActivate={(r) => setOpen((o) => (o === r.assetClass ? undefined : r.assetClass))} expandedRowId={open}
        columns={[
          { id: 'class', header: 'Asset class', cell: (r) => assetClassLabel(r.assetClass) },
          { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (r) => <Num text={fmtMoney(r.value)} />, sortValue: (r) => r.value },
          { id: 'weight', header: 'Weight', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.weight)} /> },
          { id: 'target', header: 'Target', unit: UNIT.pct, align: 'right', cell: (r) => <Num text={fmtWeight(r.target)} /> },
          { id: 'drift', header: 'Drift', unit: UNIT.pp, align: 'right', cell: (r) => <Num text={fmtDrift(r.drift)} />, sortValue: (r) => Math.abs(r.drift) },
          { id: 'band', header: 'Band', unit: UNIT.pp, align: 'right', cell: (r) => fmtTolerance(r.band) },
          { id: 'status', header: 'Status', cell: (r) => <StatusCode status={r.withinBand ? 'IN' : 'OUT'} label={r.withinBand ? 'inside its band' : 'outside its band'} /> },
          { id: 'orders', header: 'Orders', wrap: true, cell: (r) => ordersCellWords(r) },
        ]}
        totals={{
          label: 'On a model',
          tiesTo: { label: `the household's model-managed accounts, ${fmtMoney(holdings.modelValue)} ${UNIT.usd}`, expected: holdings.modelValue, actual: holdings.rows.reduce((s, r) => s + r.value, 0) },
          cells: { value: fmtMoney(holdings.modelValue) },
        }} />
      <p className="text-label text-ink-3">Enter, or a click, shows the accounts holding a class.</p>
      {expanded ? <ClassHolders row={expanded} asOf={asOf} /> : null}
      {holdings.notInTarget.length > 0 ? (
        <ul aria-label="Outside the target" className="flex flex-col gap-1">
          {holdings.notInTarget.map((a) => <li key={a.accountId} className="text-body text-ink-2">{`${a.name} · ${fmtMoney(a.value)} ${UNIT.usd} · custom mandate, outside the target: ${a.mandateSummary}`}</li>)}
        </ul>
      ) : null}
    </div>
  )
}

function ClassHolders({ row, asOf }: { row: AssetClassRow; asOf: string }) {
  const label = `${assetClassLabel(row.assetClass)} · accounts holding it`
  return (
    <section aria-label={label} className="flex min-w-0 flex-col gap-2 border-l-2 border-ink pl-4">
      <h3 className="text-label uppercase text-ink-2">{label}</h3>
      <ul className="flex flex-col gap-2">
        {row.holders.map((h) => (h.kind === 'managed' ? (
          <li key={h.accountId} className="flex flex-col gap-1">
            <span className="tabular text-body">{`${h.name} · ${fmtMoney(h.value)} ${UNIT.usd} · ${fmtWeight(h.weightInAccount)}% of the account`}</span>
            {h.orders.map((o) => <span key={o.id} className="tabular text-body text-ink-2">{holdingOrderWords(o, asOf)}</span>)}
          </li>
        ) : (
          <li key={h.heldAwayId} className="flex flex-wrap items-baseline gap-2">
            <span className="tabular text-body text-ink-2">{`${h.name} (${h.ownerName}) · ${fmtMoney(h.value)} ${UNIT.usd} as reported ${fmtDayMonthYear(h.reportedOn)} · outside the firm's view, not in the total`}</span>
            <Tag>HELD AWAY</Tag>
          </li>
        )))}
      </ul>
    </section>
  )
}
```

Create `src/workspace/household/HouseholdDecisions.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { LINK_TARGET } from '@/kit/link-target'
import { figureText } from '@/kit/figure-text'
import type { HouseholdDecision } from '@/types/workspace-household'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** This household's decide items, as the Brief groups them, and its proposals waiting for approval; each opens its thread. */
export function HouseholdDecisions({ decisions }: { decisions: HouseholdDecision[] }) {
  if (decisions.length === 0) return <p className="text-body text-ink-3">Nothing waits on a decision.</p>
  return (
    <ul aria-label="Needs a decision" className="flex flex-col gap-3">
      {decisions.map((d) => (d.kind === 'proposal' ? (
        <li key={d.proposalId} className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-body">{`${d.title} · v${d.latestVersion} awaits approval`}</span>
          <Link to={`/t/${d.threadId}`} className={LINK}>Open its thread</Link>
        </li>
      ) : (
        <li key={d.item.key} className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-body">{[d.item.title, d.item.readings.map((r) => (r.figure ? `${r.line} · ${figureText(r.figure)}` : r.line)).join('; ')].filter((x): x is string => x !== undefined).join(': ')}</span>
          <Link to={`/t/${d.threadId}`} className={LINK}>Open the Brief</Link>
        </li>
      )))}
    </ul>
  )
}
```

Create `src/workspace/household/HouseholdTasks.tsx`:

```tsx
import { Tag } from '@/kit/tag/Tag'
import { fmtDayMonthYear } from '@/kit/measure'
import type { HouseholdTask } from '@/types/workspace-household'

/** Follow-ups, open compliance items, open items and signatures, each with its owner and due date. */
export function HouseholdTasks({ tasks }: { tasks: HouseholdTask[] }) {
  if (tasks.length === 0) return <p className="text-body text-ink-3">No open tasks or items.</p>
  return (
    <ul aria-label="Tasks and open items" className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-body">{t.title}</span>
          <span className="text-body text-ink-2">{t.owner}</span>
          <span className="tabular text-body text-ink-3">{t.due ? `due ${fmtDayMonthYear(t.due)}` : 'no due date'}</span>
          {t.overdue ? <Tag tone="solid">OVERDUE</Tag> : null}
        </li>
      ))}
    </ul>
  )
}
```

Create `src/workspace/household/LastContactLine.tsx`:

```tsx
import { useId } from 'react'
import { Link } from 'react-router-dom'
import { LINK_TARGET } from '@/kit/link-target'
import { fmtWaited } from '@/kit/measure'
import { addressNameOf } from '@/lib/words'
import type { HouseholdView } from '@/types/workspace-household'
import { contactWords } from './holding-words'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

/** Who last spoke with the firm, when and where, and any client still waiting for a reply. */
export function LastContactLine({ view }: { view: Pick<HouseholdView, 'lastContact' | 'waiting' | 'asOf'> }) {
  const titleId = useId()
  const { lastContact, waiting, asOf } = view
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <div className="border-b border-ink pb-2"><h2 id={titleId} className="text-label uppercase text-ink-2">Last client contact</h2></div>
      {lastContact ? (
        <p className="flex flex-wrap items-baseline gap-x-3 text-body">
          <span>{contactWords(lastContact, asOf)}</span>
          {lastContact.where.kind === 'conversation' ? <Link to={`/t/${lastContact.where.threadId}`} className={LINK}>{`Open ${lastContact.where.title}`}</Link> : null}
        </p>
      ) : <p className="text-body text-ink-3">No contact on file.</p>}
      {waiting.map((w) => (
        <p key={w.threadId} className="flex flex-wrap items-baseline gap-x-3 text-body">
          <span className="font-semibold">{`${addressNameOf(w.clientName)} waiting ${fmtWaited(w.since, asOf)}`}</span>
          <Link to={`/t/${w.threadId}`} className={LINK}>Reply in their conversation</Link>
        </p>
      ))}
    </section>
  )
}
```

The section is named by its heading, so `getByRole('region', { name: 'Last client contact' })` finds it.

Rewrite `HouseholdPage` in `HouseholdView.tsx` (the gate, `MeetingList` and the documents, communications and activity panes are unchanged; add the imports the code names, and drop `clientFullViewHref` if only `HouseholdStanding` uses it now):

```tsx
function HouseholdPage({ view }: { view: HouseholdReadModel }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={LINK}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" words={teamWords(view.members.map((m) => m.name))} />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{view.name}</h1>
        <HouseholdStanding view={view} from={from} />
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <Reading label="Managed" value={fmtMoney(view.holdings.managedValue)} unit={UNIT.usd} size="readout-md" />
          <Reading label="Held away" value={fmtMoney(view.heldAwayValue)} unit={UNIT.usd} size="readout-md" />
        </div>
        <nav aria-label="Reports" className="flex flex-wrap gap-x-6 gap-y-1 *:inline-flex *:min-h-6 *:items-center coarse:*:min-h-11">
          <Link to={billingHref(view.id, from)} className={LINK}>Billing for this household</Link>
        </nav>
      </header>
      <Pane title="Holdings by asset class"><AssetClassTable holdings={view.holdings} asOf={view.asOf} /></Pane>
      <Pane title="Needs a decision"><HouseholdDecisions decisions={view.decisions} /></Pane>
      <Pane title="Tasks and open items"><HouseholdTasks tasks={view.tasks} /></Pane>
      <Pane title="Meetings">
        <MeetingList label="Upcoming meetings" meetings={view.meetings.upcoming} from={from} />
        <MeetingList label="Past meetings" meetings={view.meetings.past} from={from} />
      </Pane>
      <LastContactLine view={view} />
      <HouseholdSummaryPanes summary={view} />
      {/* Documents, Communications and Activity panes: unchanged from the current file. */}
      <MethodsAndSources notes={view.methods} />
    </div>
  )
}
```

The comment marks where the three existing panes stay, word for word; it is not new code.

In `src/app/routes.tsx` the household route has no handle in this task (`{ path: 'households/:householdId', element: <HouseholdView /> }`): the Book stays beside the page. Task 11 gives it the right column.

In `src/workspace/__tests__/household-client-views.test.tsx`, scope the household page's queries to `within(screen.getByRole('main'))` where the Book now offers a link of the same name.

Run: `pnpm vitest run src/workspace --testTimeout 30000`
Expected: PASS.

- [ ] **Step 5: The household scenes**

Create `e2e-visual/household.spec.ts`:

```ts
import { expectNoAxeViolations } from './axe'
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import { approve, askProposalAgent, bookColumn, heading, releaseByShortcut, settle, visit, type Theme } from './workspace-steps'

const holdings = (page: Page) => page.getByRole('main').getByRole('table', { name: 'Holdings by asset class' })

const before = (theme: Theme) => async (page: Page) => {
  await visit(page, '/households/hh-001', theme)
  await expect(holdings(page)).toBeVisible()
  await settle(page)
}

/** The morning's release, then the household reached in the app: a reload would reset the session. */
const after = (theme: Theme) => async (page: Page) => {
  await askProposalAgent(page, theme)
  await approve(page, 1)
  await releaseByShortcut(page)
  await bookColumn(page).getByRole('list', { name: 'All households' }).getByRole('link', { name: /^Johnson Household/ }).click()
  await expect(heading(page)).toHaveText('Johnson Household')
  await expect(holdings(page)).toContainText('filled today')
  await settle(page)
}

const expanded = async (page: Page) => {
  await visit(page, '/households/hh-001', 'light')
  await holdings(page).getByRole('row', { name: /^US Equity/ }).click()
  await expect(page.getByRole('region', { name: 'US Equity · accounts holding it' })).toBeVisible()
  await settle(page)
}

const SCENES: { name: string; open: (page: Page) => Promise<void> }[] = [
  { name: 'household-johnson-before-light', open: before('light') },
  { name: 'household-johnson-before-dark', open: before('dark') },
  { name: 'household-johnson-after-light', open: after('light') },
  { name: 'household-johnson-after-dark', open: after('dark') },
  { name: 'household-class-expanded-light', open: expanded },
]

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    test.describe.configure({ timeout: 120_000 })
    test('baseline at 1440px', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await scene.open(page)
      await expect(page).toHaveScreenshot(`${scene.name}.png`, SCREENSHOT)
      await expectNoAxeViolations(page)
    })
    for (const width of [1024, 1440]) {
      test(`no page-level horizontal scroll and no clipped labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await scene.open(page)
        expect(await pageOverflowX(page)).toBeLessThanOrEqual(0)
        expect(await clippedLabels(page)).toEqual([])
      })
    }
  })
}
```

In `e2e-visual/meeting-review.spec.ts`, remove the `household` scene and its function; `git rm e2e-visual/__baselines__/household-light.png`.

- [ ] **Step 6: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/household.spec.ts e2e-visual/meeting-review.spec.ts
git status --short e2e-visual/__baselines__
```

Open the five new PNGs: the header names Robert and Patricia each with their own tolerance, accounts-as-a-whole figure and WITHIN TOLERANCE tag; Managed and Held away read; the class table ties to the model-managed total; before the release the US Equity row says "2 open", after it the fills show; the expanded scene lists Robert's Individual account with "working: buy 200 QQQ, limit 480.00" and both held-away plans marked outside the firm's view; Needs a decision, Tasks and open items, Meetings and Last client contact read as the model; Methods last. Dark scenes keep contrast. `client-light` must not move. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(household): the household page answers where they stand: each member's standing, holdings by class against target with orders and fills, decisions, tasks, contact

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 11: The household's conversations, and starting one (spec §3 "Conversations about this household")

The right column of the household page lists the conversations about the household (its own, its members', its accounts'), each with its Phase 9 visibility words, and starts a new one: Just me or Larkfield team makes a thread whose subject is the household; "Client conversation with <member>" opens that member's conversation, or makes it if they have none.

**Files:**
- Create: `src/mocks/workspace/conversations.ts`, `src/mocks/workspace/__tests__/conversations.test.ts`, `src/workspace/household/HouseholdConversations.tsx`, `src/workspace/household/use-household-conversations-available.ts`, `src/workspace/household/conversation-choice.ts`, `src/workspace/__tests__/household-conversations.test.tsx`
- Modify: `src/types/workspace.ts` (`ConversationAudience`, `StartedConversation`), `src/mocks/handlers/workspace.ts` (`POST /api/workspace/threads`), `src/services/workspace.ts` (`startConversation`), `src/hooks/use-workspace.ts` (`useStartConversation`), `src/app/routes.tsx` (the household route's handle)

**Interfaces:**
- Consumes: `HouseholdView.conversations` and `members` (Task 9); `bandWordsOf` (`visibility-words.ts`); `VisibilityMark`; `RadioGroup`; `TextInput`; `Button`; `useAnnounce`; `can`, `PEOPLE`; `nextNumber`, `pad`, `store`.
- Produces:
  - `type ConversationAudience = { kind: 'private' } | { kind: 'internal' } | { kind: 'client'; clientId: string }`; `type StartedConversation = { thread: Thread; created: boolean }` in `src/types/workspace.ts`.
  - `startConversation(viewerId: string, input: { householdId: string; title: string; audience: ConversationAudience }): { ok: true; thread: Thread; created: boolean } | ConversationFailure` in `conversations.ts`.
  - `startConversation(viewer, input)` service (POST `/workspace/threads`), `useStartConversation()`.
  - `conversationChoices(members: readonly { clientId: string; name: string }[]): { value: string; label: string; audience: ConversationAudience }[]` in `conversation-choice.ts`.

- [ ] **Step 1: The engine, failing**

Create `src/mocks/workspace/__tests__/conversations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { startConversation } from '../conversations'
import { visibleThreads } from '../visibility'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const start = (viewer: string, audience: Parameters<typeof startConversation>[1]['audience'], title = "Patricia's models", householdId = 'hh-001') =>
  startConversation(viewer, { householdId, title, audience })

describe('starting a conversation from a household', () => {
  it('Just me: a thread about the household, read by its owner alone', () => {
    const { thread, created } = ok(start(ADRIAN, { kind: 'private' }))
    expect(created).toBe(true)
    expect(thread).toMatchObject({ title: "Patricia's models", visibility: 'private', ownerId: ADRIAN, memberIds: [ADRIAN], subject: { type: 'household', id: 'hh-001' } })
    expect(store().threads).toContainEqual(thread)
  })

  it('Larkfield team: a thread about the household for the team, which no client sees', () => {
    const { thread } = ok(start(ADRIAN, { kind: 'internal' }))
    expect(thread).toMatchObject({ visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'], subject: { type: 'household', id: 'hh-001' } })
    expect(visibleThreads('cli-001').map((t) => t.id)).toEqual(['th-robert'])
  })

  it('a client conversation with a member who has one opens it; none is created', () => {
    const before = store().threads.length
    const { thread, created } = ok(start(ADRIAN, { kind: 'client', clientId: 'cli-001' }))
    expect([thread.id, created, store().threads.length]).toEqual(['th-robert', false, before])
  })

  it('a client conversation with a member who has none makes it, titled with their name, and they see only it', () => {
    const { thread, created } = ok(start(ADRIAN, { kind: 'client', clientId: 'cli-005' }, '', 'hh-003'))
    expect(created).toBe(true)
    expect(thread).toMatchObject({ title: 'Sarah Williams', visibility: 'client', partyId: 'cli-005', subject: { type: 'client', id: 'cli-005' } })
  })

  it('refuses what it cannot start', () => {
    expect(start(ADRIAN, { kind: 'client', clientId: 'cli-003' })).toMatchObject({ ok: false, status: 400, code: 'NOT_A_MEMBER' })
    expect(start(ADRIAN, { kind: 'private' }, '   ')).toMatchObject({ ok: false, status: 400, code: 'TITLE_REQUIRED' })
    expect(start(ADRIAN, { kind: 'private' }, 'x'.repeat(121))).toMatchObject({ ok: false, status: 400, code: 'TITLE_TOO_LONG' })
    expect(start(ADRIAN, { kind: 'private' }, 'Notes', 'hh-999')).toMatchObject({ ok: false, status: 404, code: 'NO_HOUSEHOLD' })
    expect(start('user-003', { kind: 'client', clientId: 'cli-005' }, '', 'hh-003')).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(start('cli-001', { kind: 'private' })).toMatchObject({ ok: false, status: 404 })
  })
})
```

`cli-005` is Sarah Williams (Williams household `hh-003`, spouse); she has no conversation in the seed. Mike Chen (`user-003`, analyst) may post to the team but not draft for a client.

Run: `pnpm vitest run src/mocks/workspace/__tests__/conversations.test.ts --testTimeout 30000`
Expected: FAIL (module missing).

- [ ] **Step 2: The engine**

In `src/types/workspace.ts`:

```ts
/** Who a new conversation from a household page is for: the advisor alone, the team, or one member of the household. */
export type ConversationAudience = { kind: 'private' } | { kind: 'internal' } | { kind: 'client'; clientId: string }
/** A started conversation; `created` is false when a member's existing conversation was opened instead. */
export type StartedConversation = { thread: Thread; created: boolean }
```

Create `src/mocks/workspace/conversations.ts`:

```ts
import type { ConversationAudience, Thread } from '@/types/workspace'
import { clients } from '@/mocks/data/clients'
import { householdFixtures } from '@/mocks/data/households'
import { PEOPLE, can } from '@/mocks/data/people'
import { nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { isFirmViewer } from './visibility'

type ConversationFailure = { ok: false; status: 400 | 403 | 404; code: string; message: string }
const refuse = (status: ConversationFailure['status'], code: string, message: string): ConversationFailure => ({ ok: false, status, code, message })

const TITLE_MAX = 120
/** The people a team thread is for: everyone in the firm's advice team. Compliance supervises every firm thread without being a member. */
const TEAM_IDS: readonly string[] = PEOPLE.filter((p) => p.role === 'advisor' || p.role === 'csa' || p.role === 'analyst').map((p) => p.id)
const CLIENT_SERVICE_IDS: readonly string[] = PEOPLE.filter((p) => p.role === 'csa').map((p) => p.id)
const newThreadId = () => `th-new-${pad(nextNumber('thread'))}`

/**
 * A conversation started from a household. Just me and the team get a thread whose subject is the household. A
 * client has one conversation with the firm: asking for one with a member opens theirs, or makes it if they have none.
 */
export function startConversation(viewerId: string, input: { householdId: string; title: string; audience: ConversationAudience }): { ok: true; thread: Thread; created: boolean } | ConversationFailure {
  if (!isFirmViewer(viewerId)) return refuse(404, 'NO_HOUSEHOLD', 'Household not found.')
  const household = householdFixtures.find((h) => h.id === input.householdId)
  if (!household) return refuse(404, 'NO_HOUSEHOLD', 'Household not found.')
  const s = store()
  const { audience } = input
  if (audience.kind === 'client') {
    if (!household.members.some((m) => m.clientId === audience.clientId)) return refuse(400, 'NOT_A_MEMBER', `${audience.clientId} is not a member of ${household.name}.`)
    if (!can(viewerId, 'draft_for_client')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor and client service write to a client.')
    const existing = s.threads.find((t) => t.visibility === 'client' && t.partyId === audience.clientId)
    if (existing) return { ok: true, thread: existing, created: false }
    const client = clients.find((c) => c.id === audience.clientId)
    if (!client) throw new Error(`Household ${household.id} names a member ${audience.clientId} the CRM does not know`)
    const thread: Thread = {
      id: newThreadId(), title: client.fullName, visibility: 'client', partyId: client.id,
      memberIds: [client.id, ...new Set([viewerId, ...CLIENT_SERVICE_IDS])], agentIds: [], subject: { type: 'client', id: client.id },
    }
    s.threads.push(thread)
    return { ok: true, thread, created: true }
  }
  if (!can(viewerId, 'post_firm')) return refuse(403, 'NOT_PERMITTED', 'Only the firm starts a conversation here.')
  const title = input.title.trim()
  if (title.length === 0) return refuse(400, 'TITLE_REQUIRED', 'Give the conversation a title.')
  if (title.length > TITLE_MAX) return refuse(400, 'TITLE_TOO_LONG', `A title is at most ${TITLE_MAX} characters.`)
  const subject = { type: 'household' as const, id: household.id }
  const thread: Thread = audience.kind === 'private'
    ? { id: newThreadId(), title, visibility: 'private', ownerId: viewerId, memberIds: [viewerId], agentIds: [], subject }
    : { id: newThreadId(), title, visibility: 'internal', memberIds: [...new Set([viewerId, ...TEAM_IDS])], agentIds: [], subject }
  s.threads.push(thread)
  return { ok: true, thread, created: true }
}
```

Run: `pnpm vitest run src/mocks/workspace/__tests__/conversations.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 3: The route, the service and the hook**

In `src/mocks/handlers/workspace.ts`, before the catch-all:

```ts
  http.post('/api/workspace/threads', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    const audience = parseAudience(body?.audience)
    if (!body || !nonEmptyString(body.householdId) || typeof body.title !== 'string' || !audience) {
      return badRequest('householdId, a title and an audience (private, internal, or client with a clientId) are required.')
    }
    const r = startConversation(viewer.viewerId, { householdId: body.householdId, title: body.title, audience })
    return r.ok ? HttpResponse.json({ thread: r.thread, created: r.created }, { status: r.created ? 201 : 200 }) : refusal(r)
  }),
```

with, near `parseSuitability`:

```ts
function parseAudience(value: unknown): ConversationAudience | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { kind, clientId } = value as Record<string, unknown>
  if (kind === 'private' || kind === 'internal') return { kind }
  return kind === 'client' && nonEmptyString(clientId) ? { kind, clientId } : undefined
}
```

In `src/services/workspace.ts`: `export const startConversation = (viewer: string, input: { householdId: string; title: string; audience: ConversationAudience }) => post<StartedConversation>('/workspace/threads', input, as(viewer))`.

In `src/hooks/use-workspace.ts`:

```ts
export function useStartConversation() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (input: { householdId: string; title: string; audience: ConversationAudience }) => api.startConversation(viewerId, input), onSettled: invalidate })
}
```

Run: `pnpm vitest run src/mocks/handlers/__tests__/outsider-routes.test.ts src/__tests__/guardrails/api-routes.test.ts --testTimeout 30000`
Expected: PASS: outsiders get 404 from `POST /api/workspace/threads` before the body is read.

- [ ] **Step 4: The right column, failing**

Create `src/workspace/__tests__/household-conversations.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

const column = () => screen.getByRole('complementary', { name: 'Conversations' })

describe("the household's conversations", () => {
  it('lists each with who reads it, in the Phase 9 words', async () => {
    renderRoutes(routes, '/households/hh-001')
    const list = await within(column()).findByRole('list', { name: 'Conversations about this household' })
    expect(within(list).getByRole('link', { name: /Johnson annual review/ })).toHaveTextContent("Larkfield team · Robert and Patricia can't see this")
    expect(within(list).getByRole('link', { name: /^Patricia Johnson/ })).toHaveTextContent('Patricia Johnson can read this')
  })

  it('starts a Just me conversation about the household and opens it', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    const form = await within(column()).findByRole('group', { name: 'Who reads it' })
    await user.click(within(form).getByRole('radio', { name: 'Just me' }))
    await user.type(within(column()).getByRole('textbox', { name: 'Title' }), "Patricia's models")
    await user.click(within(column()).getByRole('button', { name: 'Start the conversation' }))
    expect(await screen.findByRole('heading', { level: 1, name: "Patricia's models" })).toBeInTheDocument()
  })

  it("opens Robert's own conversation rather than making a second", async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/households/hh-001')
    await user.click(await within(column()).findByRole('radio', { name: 'Client conversation with Robert' }))
    await user.click(within(column()).getByRole('button', { name: 'Open the conversation' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })).toBeInTheDocument()
  })
})
```

Run: `pnpm vitest run src/workspace/__tests__/household-conversations.test.tsx --testTimeout 30000`
Expected: FAIL (no complementary region named "Conversations").

- [ ] **Step 5: The right column**

Create `src/workspace/household/conversation-choice.ts`:

```ts
import { addressNameOf } from '@/lib/words'
import type { ConversationAudience } from '@/types/workspace'

type ConversationChoice = { value: string; label: string; audience: ConversationAudience }

/** Who a new conversation is for, in the Phase 9 words: Just me, the Larkfield team, or a client conversation with one member. */
export function conversationChoices(members: readonly { clientId: string; name: string }[]): ConversationChoice[] {
  return [
    { value: 'private', label: 'Just me', audience: { kind: 'private' } },
    { value: 'internal', label: 'Larkfield team', audience: { kind: 'internal' } },
    ...members.map((m) => ({ value: `client:${m.clientId}`, label: `Client conversation with ${addressNameOf(m.name)}`, audience: { kind: 'client' as const, clientId: m.clientId } })),
  ]
}
```

Create `src/workspace/household/use-household-conversations-available.ts`:

```ts
import { useParams } from 'react-router-dom'
import { useHousehold } from '@/hooks/use-meetings'

/** The household's conversations show unless the household is not found or failed to load; the page says why. */
export function useHouseholdConversationsAvailable(): boolean {
  const { householdId } = useParams()
  if (!householdId) throw new Error('The household column needs a household id')
  return !useHousehold(householdId).isError
}
```

Create `src/workspace/household/HouseholdConversations.tsx`:

```tsx
import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { RadioGroup } from '@/kit/radio-group/RadioGroup'
import { TextInput } from '@/kit/text-input/TextInput'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-meetings'
import { useStartConversation } from '@/hooks/use-workspace'
import { bandWordsOf } from '@/workspace/people/visibility-words'
import { conversationChoices } from './conversation-choice'

/** The household's conversations, each with who reads it, and a new one started here. */
export function HouseholdConversations() {
  const { householdId } = useParams()
  if (!householdId) throw new Error('The household column needs a household id')
  const household = useHousehold(householdId)
  if (household.isPending) return <p role="status" className="text-body text-ink-3">Loading the conversations…</p>
  if (household.isError) return null
  const view = household.data
  return (
    <div className="flex flex-col gap-6">
      <ul aria-label="Conversations about this household" className="flex flex-col">
        {view.conversations.map((c) => (
          <li key={c.threadId}>
            <NavLink to={`/t/${c.threadId}`} className={({ isActive }) => cn('flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2 hover:bg-face', isActive ? 'border-ink bg-face' : 'border-transparent')}>
              <VisibilityMark visibility={c.visibility} />
              <span className="text-body">{c.title}</span>
              <span className="text-label normal-case text-ink-3">{bandWordsOf(c.audience, false)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <StartConversation householdId={view.id} members={view.members} />
    </div>
  )
}

function StartConversation({ householdId, members }: { householdId: string; members: readonly { clientId: string; name: string }[] }) {
  const choices = conversationChoices(members)
  const [value, setValue] = useState<string>('internal')
  const [title, setTitle] = useState('')
  const start = useStartConversation()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const choice = choices.find((c) => c.value === value)
  if (!choice) throw new Error(`No conversation choice ${value}`)
  const forClient = choice.audience.kind === 'client'
  const submit = () => start.mutate({ householdId, title, audience: choice.audience }, {
    onSuccess: ({ thread, created }) => {
      announce(created ? `Started ${thread.title}.` : `Opened ${thread.title}.`)
      navigate(`/t/${thread.id}`)
    },
  })
  return (
    <section aria-label="Start a conversation" className="flex flex-col gap-3 border-t border-rule pt-4">
      <RadioGroup legend="Who reads it" value={value} onChange={setValue} options={choices.map(({ value: v, label }) => ({ value: v, label }))} />
      {forClient ? null : <TextInput label="Title" value={title} rows={1} onChange={setTitle} />}
      <Button pending={start.isPending} disabled={!forClient && title.trim() === ''} onClick={submit}>{forClient ? 'Open the conversation' : 'Start the conversation'}</Button>
      {start.isError ? <p role="alert" className="text-body">{start.error.message}</p> : null}
    </section>
  )
}
```

In `src/app/routes.tsx`:

```tsx
const householdHandle: ShellHandle = { contextColumn: { label: 'Conversations', Content: HouseholdConversations, useAvailable: useHouseholdConversationsAvailable } }
```

and `{ path: 'households/:householdId', element: <HouseholdView />, handle: householdHandle }`.

Run: `pnpm vitest run src/workspace --testTimeout 30000`
Expected: PASS. (`RadioGroup`'s value is `V | undefined`; the choice values are plain strings, so `V` is `string`.)

- [ ] **Step 6: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/household.spec.ts
git status --short e2e-visual/__baselines__
```

Open the five household PNGs: the right column lists the Johnson conversations with their words (the meeting and review threads "Larkfield team · Robert and Patricia can't see this"; Robert's and Patricia's "… can read this") and the start form with Larkfield team chosen; the main column narrows to six of twelve and the class table still fits without a page scroll at 1024 px (the spec checks it). Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(household): its conversations sit beside the page with who reads each; a new one starts here, a client's opens their own

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: One Agents page; every agent's Can / Can't rewritten (spec §5 "The agents roster"; the parked "stage" item)

"Agents on this desk" leaves the everyday column for one **Agents** page, reachable from Firm and from the command line, listing every agent with what it can and can't do. Thread Details keep the agents in that thread. Every scope is rewritten in plain words without "stage", and "stage trades" joins the retired words.

**Files:**
- Modify: `src/mocks/data/people.ts` (`AGENTS` scopes), `src/workspace/shell/ThreadList.tsx` (remove `DeskAgents`), `src/workspace/shell/DeskLinks.tsx` (`DESK` gains Agents), `src/workspace/shell/ThreadListSkeleton.tsx` (Firm rows 3), `src/app/routes.tsx` (`agents`), `src/app/use-destinations.ts`, `src/__tests__/guardrails/retired-words.ts`, `src/__tests__/guardrails/retired-words.test.ts`, `src/mocks/data/__tests__/people.test.ts`, `src/workspace/__tests__/context.test.tsx`, `src/workspace/__tests__/shell.test.tsx`, `e2e-visual/shell.spec.ts`
- Create: `src/workspace/agents/AgentsPage.tsx`, `src/workspace/__tests__/agents-page.test.tsx`

**Interfaces:**
- Consumes: `AgentScope` (`src/workspace/people/AgentScope.tsx`); `useDirectory`, `isExternalViewerIn`; `FullViewNotFound`; `PAGE_TITLE_ID`.
- Produces: the route `/agents` (firm only; outsiders read "Agents not found"); the destination `{ id: 'agents', label: 'Agents' }`.

- [ ] **Step 1: Failing tests**

Add to `src/mocks/data/__tests__/people.test.ts`:

```ts
  it("states each agent's scope in plain words, never \"stage\"", () => {
    for (const a of AGENTS) {
      for (const act of [...a.scope.may, ...a.scope.mayNot]) expect(act, `${a.name}: ${act}`).not.toMatch(/\bstag(?:e|ed|es|ing)\b/i)
    }
    expect(AGENTS.find((a) => a.id === 'drift-monitor')?.scope.mayNot).toContain('place or approve trades')
    expect(AGENTS.find((a) => a.id === 'harvest-scanner')?.scope.mayNot).toContain('place or approve trades')
  })
```

In `src/__tests__/guardrails/retired-words.ts`, append to `RETIRED_WORDS`:

```ts
  // An agent places or approves nothing; "stage" was the system's word for an order waiting on compliance.
  { word: 'stage trades', pattern: /\bstage(?: or release)? trades\b/i, retired: true },
```

and in `retired-words.test.ts`'s pattern table: `['stage trades', 'stage or release trades', true]`, `['stage trades', 'stage trades', true]`, `['stage trades', 'place or approve trades', false]`.

Create `src/workspace/__tests__/agents-page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'

describe('the Agents page', () => {
  it('lists every agent with what it can and cannot do', async () => {
    renderRoutes(routes, '/agents')
    expect(await screen.findByRole('heading', { level: 1, name: 'Agents' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Agents' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(9)
    expect(list).toHaveTextContent("Drift Monitor")
    expect(list).toHaveTextContent('place or approve trades')
  })
  it('is reached from Firm, and the everyday column no longer lists the agents', async () => {
    renderRoutes(routes, '/')
    const book = await screen.findByRole('navigation', { name: 'Book' })
    expect(within(book).getByRole('link', { name: 'Agents' })).toHaveAttribute('href', '/agents')
    expect(within(book).queryByRole('heading', { name: 'Agents' })).toBeNull()
  })
  it('is not found for an outsider', async () => {
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/agents')
    expect(await screen.findByRole('heading', { level: 1, name: 'Agents not found' })).toBeInTheDocument()
  })
})
```

Run: `pnpm vitest run src/mocks/data/__tests__/people.test.ts src/__tests__/guardrails/retired-words.test.ts src/workspace/__tests__/agents-page.test.tsx --testTimeout 30000`
Expected: FAIL: "stage or release trades" and "stage trades" are still in `people.ts`; there is no `/agents` route.

- [ ] **Step 2: The scopes, in plain words**

In `src/mocks/data/people.ts`, `AGENTS` becomes:

```ts
export const AGENTS: readonly AgentProfile[] = [
  { id: 'drift-monitor', name: 'Drift Monitor', produces: 'findings', scope: { may: ['measure drift against the model', 'flag what sits outside its band'], mayNot: ['place or approve trades', 'post in a client conversation'] } },
  { id: 'pretrade-check', name: 'Pre-trade Check', produces: 'findings', scope: { may: ['run the pre-trade checks on a proposal and report them'], mayNot: ['clear a block', 'release orders', 'post in a client conversation'] } },
  { id: 'harvest-scanner', name: 'Harvest Scanner', produces: 'findings', scope: { may: ['find losses that can be harvested, and their wash-sale windows'], mayNot: ['place or approve trades', 'post in a client conversation'] } },
  { id: 'proposal', name: 'Proposal Agent', produces: 'proposals', scope: { may: ['draft and revise proposals within the constraints given', "draft and revise a prospect's proposal within the constraints given"], mayNot: ['approve a proposal', 'release orders', 'post in a client conversation'] } },
  { id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft a client letter from an approved version', 'draft a meeting recap from a filed record'], mayNot: ['send', 'post in a client conversation'] } },
  { id: 'meeting-prep', name: 'Meeting Prep', produces: 'agenda', scope: { may: ["measure the household's accounts", 'propose an agenda'], mayNot: ['file notes', 'contact the client', 'post in a client conversation'] } },
  { id: 'meeting-notes', name: 'Meeting Notes', produces: 'notes', scope: { may: ['draft notes from the transcript, each line citing it', 'check what the notes say about the book against the household ledger'], mayNot: ['file the record', 'assign people', 'add a recommendation nobody made', 'post in a client conversation'] } },
  { id: 'prospect-profile', name: 'Prospect Profile', produces: 'findings', scope: { may: ['score the questionnaire', "map it to the firm's model, showing the working"], mayNot: ['contact the prospect', 'recommend accounts', 'post in a client conversation'] } },
  { id: 'transfer-in', name: 'Transfer-In', produces: 'findings', scope: { may: ["read the prospect's statements", 'weigh moving each holding in kind against selling it, with the gain and a tax estimate'], mayNot: ['sell anything', 'recommend a rollover', 'post in a client conversation'] } },
]
```

- [ ] **Step 3: The page, the link, the destination**

Create `src/workspace/agents/AgentsPage.tsx`:

```tsx
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useDirectory } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { AgentScope } from '@/workspace/people/AgentScope'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useViewer } from '@/workspace/viewer/use-viewer'

/** Every agent on the desk and what each can and can't do. Agents measure, draft and check; people decide, approve and send. */
export function AgentsPage() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  if (directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the agents…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (isExternalViewerIn(directory.data, viewerId)) return <FullViewNotFound subject="Agents" />
  return (
    <div className="flex max-w-[46rem] min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Agents</h1>
        <p className="text-copy text-ink-2">Agents measure, draft and check. People decide, approve and send, and every act is recorded under a person's name.</p>
      </div>
      <ul aria-label="Agents" className="flex flex-col gap-5">
        {directory.data.agents.map((a) => <li key={a.id} className="border-b border-rule pb-4 last:border-b-0"><AgentScope agent={a} /></li>)}
      </ul>
    </div>
  )
}
```

In `routes.tsx`: `{ path: 'agents', lazy: () => import('@/workspace/agents/AgentsPage').then((m) => ({ Component: m.AgentsPage })), HydrateFallback: PageLoading, handle: fullWidthHandle }`.

In `DeskLinks.tsx`: `DESK` is `[{ to: '/supervision', label: 'Supervision' }, { to: '/archive', label: 'Archive' }, { to: '/agents', label: 'Agents' }]`.

In `ThreadList.tsx`: delete `DeskAgents` and its render; drop the imports only it used (`AgentScope`, `AgentProfile`).

In `use-destinations.ts`, after the Archive destination: `...(firmViewer ? [{ id: 'agents', label: 'Agents', aliases: ['agent scopes', 'what agents can do'], run: () => navigate('/agents') }] : []),`.

`ThreadListSkeleton`: Firm reserves 3 rows; `shell.test.tsx`'s skeleton count rises by one.

Update `src/workspace/__tests__/context.test.tsx` (the Details column's agent scopes read the new words) and any test that read the old scope strings (`rg -n "stage or release trades|stage trades|measure and flag|post in a client thread" src --glob '**/__tests__/**'`).

Add to `e2e-visual/shell.spec.ts` the scene `{ name: 'agents-light', hasContext: false, open: async (page) => { await visit(page, '/agents', 'light'); await expect(page.getByRole('list', { name: 'Agents' })).toBeVisible(); await settle(page) } }`, and to the command-line story (if it lists destinations) the "Agents" destination.

Run: `pnpm vitest run --testTimeout 30000`
Expected: PASS, the retired-words guard included.

- [ ] **Step 4: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/shell.spec.ts e2e-visual/rebalance-job.spec.ts e2e-visual/compliance-review.spec.ts e2e-visual/meeting-review.spec.ts e2e-visual/prospect-proposal.spec.ts e2e-visual/phone.spec.ts e2e-visual/dialogs.spec.ts e2e-visual/household.spec.ts
git status --short e2e-visual/__baselines__
```

Open every moved PNG: Firm lists Supervision, Archive, Agents; no Agents pane in the column; Details panes read the new scopes ("Can't place or approve trades"); `agents-light` lists the nine agents. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(agents): one Agents page from Firm and the command line; every scope in plain words, and \"stage trades\" retired

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Practice: the largest clients' share of revenue (spec §5 "Practice")

The HHI of household shares and the effective number of households become "Largest 3 clients' share of revenue" and "Largest 5 clients' share of revenue", from the same billing figures the table shows.

**Files:**
- Modify: `src/types/reference-practice.ts`, `src/mocks/reference/practice.ts`, `src/workspace/reference/PracticePage.tsx`, `src/mocks/reference/__tests__/practice.test.ts`, and any UI test that read the two old readings (`rg -n "HHI of household shares|Effective number of households" src`)

**Interfaces:**
- Produces: `PracticeView.concentration: { top3Share: number; top5Share: number }` (fractions of annual revenue).

- [ ] **Step 1: Failing test**

In `src/mocks/reference/__tests__/practice.test.ts`, replace the HHI case with:

```ts
  it("states concentration as the largest clients' share of revenue, top three and top five, from the table's own shares", () => {
    const { concentration, households } = view()
    const shares = households.map((h) => h.shareOfRevenue).sort((a, b) => b - a)
    const top = (n: number) => shares.slice(0, n).reduce((s, x) => s + x, 0)
    expect(concentration).toEqual({ top3Share: top(3), top5Share: top(5) })
    expect(concentration.top3Share).toBeGreaterThan(0.5)
    expect(concentration.top5Share).toBeLessThanOrEqual(1)
  })
```

Run: `pnpm vitest run src/mocks/reference/__tests__/practice.test.ts --testTimeout 30000`
Expected: FAIL (`concentration` is `{ hhi, effectiveN }`).

If `top3Share` is not above one half with the fixtures' fees (Chen-Wong 26.8% and Johnson 18.3% are the two largest), drop that one expectation and say so; the equality to the table's shares is the requirement.

- [ ] **Step 2: The figure, the page, Methods**

`src/types/reference-practice.ts`: `concentration: { top3Share: number; top5Share: number }`.

`src/mocks/reference/practice.ts`:
- drop `effectiveN` and `herfindahlIndex` from the import and the `index` constant;
- `const byRevenue = rows.map((r) => r.shareOfRevenue).sort((a, b) => b - a)` and `const topShare = (n: number) => byRevenue.slice(0, n).reduce((s, x) => s + x, 0)`;
- `concentration: { top3Share: topShare(3), top5Share: topShare(5) }`;
- the Methods note: `{ label: 'Concentration', modeled: false, text: "The largest clients' share of annual revenue: the three and the five households with the largest fees, each household's fee over the firm's annual revenue, as the table states them." }`.

`PracticePage.tsx`, the Concentration pane:

```tsx
            <Reading label="Largest 3 clients' share of revenue" value={fmtWeight(view.concentration.top3Share)} unit={UNIT.pct} />
            <Reading label="Largest 5 clients' share of revenue" value={fmtWeight(view.concentration.top5Share)} unit={UNIT.pct} />
```

and drop `fmtRatio` (and `fmtQuantity` if nothing else uses it) from the imports.

Run: `pnpm vitest run src/mocks/reference src/workspace --testTimeout 30000` and `pnpm dlx knip@6.39.0 --no-progress`
Expected: PASS; knip clean (`herfindahlIndex` and `effectiveN` are still used by `pms.ts` and `risk.ts` for positions).

- [ ] **Step 3: Baselines, every check, commit**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/reference-views.spec.ts
git status --short e2e-visual/__baselines__
```

Open `practice-light.png`: the two readings in percent; Methods states them. Nothing else moves. Then the full suite and the end-of-task checks.

```bash
git add -A src e2e-visual
git commit -m "feat(practice): concentration as the largest clients' share of revenue, top three and top five

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 14: The story-replay guard (spec §4 "Guard")

A test replays the README path through the engine, step by step, and after each step checks every claim made since the last one against the household ledger as it stood at that moment: agent findings, proposal summaries, the fills report, the meeting notes and the client letters. A claim that speaks of trades, fills or holdings must match a rule, and the rule must agree with the ledger. Two shorter replays hold the review before the release and with nothing approved.

**Files:**
- Create: `src/mocks/__tests__/ledger-claims.ts`, `src/mocks/__tests__/story-replay.test.ts`

**Interfaces:**
- Consumes: `householdLedger`, `HouseholdLedger` (Task 1); `REBALANCE_LINE` (Task 4); `clientRiskOf`; `clientDate` (`src/kit/measure.ts`); the engine's acts (`carryFinding`, `createProposal`, `reviseProposal`, `saveVersion`, `approveProposal`, `releaseOrders`, `runAgent`, `remeasureBrief`, `runMeetingPrep`, `holdMeeting`, `draftMeetingNotes`, `fileMeetingRecord`, `draftRecap`, `sendToParty`); `JOHNSON_REASON` (`src/test/suitability-fixture.ts`).
- Produces: `newClaims(seen: Set<string>): Claim[]` and `disagreements(claims: readonly Claim[], ledger: HouseholdLedger): { unguarded: string[]; disagreeing: string[]; rulesUsed: Set<string> }`; the `Claim` type and the `RULES` table stay inside `ledger-claims.ts`.

- [ ] **Step 1: The rules**

Create `src/mocks/__tests__/ledger-claims.ts`:

```ts
import type { AgentId, Figure, Message } from '@/types/workspace'
import { store } from '@/mocks/data/workspace-store'
import { accounts } from '@/mocks/data/accounts'
import { clientRiskOf } from '@/mocks/reference/risk'
import { REBALANCE_LINE } from '@/mocks/agents/meeting-notes'
import type { HouseholdLedger } from '@/mocks/workspace/household-ledger'
import { clientDate } from '@/kit/measure'

/** Something the product said about the Johnsons' book, with what it said it from. */
type Claim = { key: string; source: 'finding' | 'proposal' | 'fills' | 'notes' | 'letter'; agentId?: AgentId; accountId?: string; text: string; figures: Figure[]; fillIds?: string[] }
type Rule = { name: string; applies: (c: Claim) => boolean; disagrees: (c: Claim, ledger: HouseholdLedger) => string | undefined }

/** Words that make a claim about trades, fills or holdings: such a claim must be checked by a rule. */
const TRADE_WORDS = /\b(?:filled|bought|sold at a loss (?:today|recently)|working orders?|this morning's rebalance|awaiting compliance release|approved or traded)\b/i
const JOHNSON_THREADS: ReadonlySet<string> = new Set(['th-brief', 'th-johnson-review', 'th-johnson-meeting'])
const CLIENT_THREADS: ReadonlySet<string> = new Set(['th-robert', 'th-patricia'])

const symbolIn = (c: Claim, prefix: string): string => {
  const figure = c.figures.find((f) => f.label.startsWith(prefix))
  if (!figure) throw new Error(`"${c.text}" carries no "${prefix}" figure`)
  return figure.label.slice(prefix.length)
}
const accountOf = (c: Claim, ledger: HouseholdLedger) => {
  const found = ledger.accounts.find((a) => a.account.id === c.accountId)
  if (!found) throw new Error(`"${c.text}" names no Johnson account`)
  return found
}
const boughtToday = (ledger: HouseholdLedger, accountId: string | undefined, symbol: string) =>
  ledger.fillsOnDay.some((f) => f.accountId === accountId && f.side === 'buy' && f.symbol === symbol)
const rebalanceState = (ledger: HouseholdLedger) => (ledger.fillsOnDay.some((f) => f.source.kind === 'proposal') ? 'filled'
  : ledger.openOrders.some((o) => o.status === 'pending_compliance') ? 'awaiting_release' : 'not_approved')
const fail = (wrong: boolean, why: string) => (wrong ? why : undefined)

const RULES: readonly Rule[] = [
  { name: 'harvest offered', applies: (c) => c.agentId === 'harvest-scanner' && /can be sold at a loss today/.test(c.text) && !/^No position/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Loss allowed now · '); return fail(!accountOf(c, l).positions.some((p) => p.symbol === s) || boughtToday(l, c.accountId, s), `${s} offered for harvest but not held, or bought today`) } },
  { name: 'realized loss', applies: (c) => /was sold at a loss (?:today|recently)/.test(c.text),
    disagrees: (c, l) => {
      const s = symbolIn(c, 'Loss realized · ')
      const today = /sold at a loss today/.test(c.text)
      return fail(!l.realizedSales.some((r) => r.symbol === s && r.realizedGainLoss < 0 && (today ? r.saleDate === l.day : r.saleDate < l.day)), `${s} realized loss ${today ? 'today' : 'recently'} not in the ledger`)
    } },
  { name: 'bought today', applies: (c) => /was bought today in this account/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Bought today · '); return fail(!boughtToday(l, c.accountId, s), `${s} said bought today, no buy fill today`) } },
  { name: 'replacement held', applies: (c) => /was bought in place of the/.test(c.text),
    disagrees: (c, l) => {
      const figure = c.figures.find((f) => f.label.endsWith(' weight'))
      const s = figure?.label.replace(/ weight$/, '')
      return fail(s === undefined || !accountOf(c, l).positions.some((p) => p.symbol === s) || !l.realizedSales.some((r) => r.replacementSymbol === s), `replacement ${s ?? '?'} not held or not a replacement`)
    } },
  { name: 'prep: nothing filled', applies: (c) => c.text === "No orders have been filled in the household's accounts today.",
    disagrees: (_, l) => fail(l.fillsOnDay.length > 0, 'Meeting Prep said nothing filled today; the ledger has fills') },
  { name: 'prep: filled', applies: (c) => /^Orders released today were filled in /.test(c.text),
    disagrees: (_, l) => fail(!l.fillsOnDay.some((f) => f.source.kind === 'proposal'), 'Meeting Prep said orders filled today; the ledger has none') },
  { name: 'prep: wash-sale windows', applies: (c) => c.agentId === 'meeting-prep' && /^The taxpayer has (?:open wash-sale windows|no open wash-sale window)/.test(c.text),
    disagrees: (c, l) => fail(/^The taxpayer has no open/.test(c.text) !== (l.washWindows.length === 0), 'Meeting Prep and the ledger disagree on the open wash-sale windows') },
  { name: 'working order overlap', applies: (c) => /already has a working order/.test(c.text),
    disagrees: (c, l) => { const s = symbolIn(c, 'Working order · '); return fail(!l.openOrders.some((o) => o.status === 'working' && o.symbol === s && o.accountId === c.accountId), `no working order on ${s}`) } },
  { name: 'proposal counts working orders', applies: (c) => c.source === 'proposal' && /counts the working orders? already open/.test(c.text),
    disagrees: (c, l) => fail(!l.openOrders.some((o) => o.status === 'working' && o.accountId === c.accountId), 'a proposal counted a working order the ledger does not have') },
  { name: 'notes: the rebalance', applies: (c) => c.source === 'notes' && Object.values(REBALANCE_LINE).includes(c.text),
    disagrees: (c, l) => fail(REBALANCE_LINE[rebalanceState(l)] !== c.text, `the notes say "${c.text}"; the ledger says ${rebalanceState(l)}`) },
  { name: "notes: Patricia's accounts", applies: (c) => c.source === 'notes' && /as a whole they sit (?:within|above|below) her /.test(c.text),
    disagrees: (c) => {
      const risk = clientRiskOf('cli-002')
      return fail(!risk || !c.text.includes(`sit ${risk.posture.status} her ${risk.posture.tolerance.band} tolerance`), "the notes and the Risk view disagree on Patricia's accounts")
    } },
  { name: 'letter: the Intel window', applies: (c) => c.source === 'letter' && /Intel shares in any of your accounts through /.test(c.text),
    disagrees: (c, l) => {
      const end = l.washWindows.filter((w) => w.symbol === 'INTC').map((w) => w.end).sort().pop()
      return fail(end === undefined || !c.text.includes(`through ${clientDate(end)}`), 'the letter states an Intel window the ledger does not')
    } },
  { name: "letter: no trades in Patricia's accounts", applies: (c) => c.source === 'letter' && /We won't trade in Patricia's accounts/.test(c.text),
    disagrees: (_, l) => {
      const hers = new Set(accounts.filter((a) => a.clientId === 'cli-002').map((a) => a.id))
      return fail(l.openOrders.some((o) => hers.has(o.accountId)) || l.fillsOnDay.some((f) => hers.has(f.accountId)), "the letter promises no trades in Patricia's accounts; the ledger has one")
    } },
  { name: 'fills report', applies: (c) => c.source === 'fills',
    disagrees: (c, l) => fail((c.fillIds ?? []).some((id) => !l.fillsOnDay.some((f) => f.id === id)), 'the fills report names a fill the ledger does not have today') },
]

const subjectAccount = (threadId: string): string | undefined => {
  const subject = store().threads.find((t) => t.id === threadId)?.subject
  return subject?.type === 'account' ? subject.id : undefined
}

/** Every claim made since the keys in `seen`, which it then adds. */
export function newClaims(seen: Set<string>): Claim[] {
  const s = store()
  const fresh = (key: string) => (seen.has(key) ? false : (seen.add(key), true))
  const messages = s.messages.filter((m) => JOHNSON_THREADS.has(m.threadId) || CLIENT_THREADS.has(m.threadId))
  const fromMessages = messages.flatMap((m: Message): Claim[] => {
    if (!fresh(`msg:${m.id}`)) return []
    if (m.kind === 'agent_finding') return [{ key: m.id, source: 'finding', agentId: m.agentId, accountId: subjectAccount(m.threadId), text: m.claim, figures: m.figures }]
    if (m.kind === 'fills') return [{ key: m.id, source: 'fills', text: `${m.title} v${m.version}`, figures: [], fillIds: m.fills.map((f) => f.id) }]
    if (m.kind === 'text' && CLIENT_THREADS.has(m.threadId) && !m.authorId.startsWith('cli-')) return m.body.split('\n').map((line, i) => ({ key: `${m.id}:${i}`, source: 'letter', text: line, figures: [] }))
    return []
  })
  const fromProposals = s.proposals.flatMap((p) => p.versions.flatMap((v): Claim[] => (fresh(`v:${p.id}:${v.n}`) ? [{ key: `${p.id} v${v.n}`, source: 'proposal', accountId: p.accountId, text: v.changeSummary, figures: [] }] : [])))
  const fromNotes = s.meetings.flatMap((m) => (m.notesDraft ?? []).flatMap((l): Claim[] => (fresh(`n:${m.eventId}:${l.id}:${l.text}`) ? [{ key: l.id, source: 'notes', text: l.text, figures: [] }] : [])))
  const fromDrafts = s.drafts.filter((d) => CLIENT_THREADS.has(d.clientThreadId)).flatMap((d) => (fresh(`d:${d.id}`) ? d.body.split('\n').map((line, i): Claim => ({ key: `${d.id}:${i}`, source: 'letter', text: line, figures: [] })) : []))
  return [...fromMessages, ...fromProposals, ...fromNotes, ...fromDrafts]
}

/** What disagrees: a trade claim no rule checks (unguarded), or one its rule finds the ledger contradicts. */
export function disagreements(claims: readonly Claim[], ledger: HouseholdLedger): { unguarded: string[]; disagreeing: string[]; rulesUsed: Set<string> } {
  const rulesUsed = new Set<string>()
  const unguarded: string[] = []
  const disagreeing: string[] = []
  for (const c of claims) {
    const rules = RULES.filter((r) => r.applies(c))
    if (rules.length === 0 && TRADE_WORDS.test(c.text)) unguarded.push(`${c.source} ${c.key}: ${c.text}`)
    for (const r of rules) {
      rulesUsed.add(r.name)
      const why = r.disagrees(c, ledger)
      if (why) disagreeing.push(`${r.name} · ${c.source} ${c.key}: ${why}`)
    }
  }
  return { unguarded, disagreeing, rulesUsed }
}
```

- [ ] **Step 2: The replay, failing first against a planted contradiction**

Create `src/mocks/__tests__/story-replay.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REASON } from '@/test/suitability-fixture'
import { householdLedger } from '@/mocks/workspace/household-ledger'
import { carryFinding } from '@/mocks/workspace/carry'
import { createProposal, reviseProposal, saveVersion } from '@/mocks/workspace/proposals'
import { approveProposal } from '@/mocks/workspace/proposal-acts'
import { releaseOrders } from '@/mocks/workspace/compliance-acts'
import { runAgent } from '@/mocks/workspace/run-agent'
import { remeasureBrief } from '@/mocks/workspace/brief-remeasure'
import { runMeetingPrep } from '@/mocks/workspace/meeting-agents'
import { draftMeetingNotes } from '@/mocks/workspace/meeting-agents'
import { holdMeeting, meetingView } from '@/mocks/workspace/meetings'
import { fileMeetingRecord } from '@/mocks/workspace/meeting-acts'
import { draftRecap } from '@/mocks/workspace/recap'
import { sendToParty } from '@/mocks/workspace/acts'
import { ok } from '@/mocks/workspace/__tests__/story-fixture'
import { disagreements, newClaims } from './ledger-claims'

const ADRIAN = 'user-001'
const MARK = 'cco-001'

/** Checks every claim made since the last check against the ledger as it stands now; returns the rules it used. */
function checker() {
  const seen = new Set<string>()
  const used = new Set<string>()
  let checked = 0
  const check = (step: string) => {
    const claims = newClaims(seen)
    checked += claims.length
    const { unguarded, disagreeing, rulesUsed } = disagreements(claims, householdLedger('hh-001'))
    rulesUsed.forEach((r) => used.add(r))
    expect(unguarded, `${step}: claims about trades, fills or holdings that no rule checks`).toEqual([])
    expect(disagreeing, `${step}: claims the ledger contradicts`).toEqual([])
  }
  return { check, used, count: () => checked }
}

function heldDraftedFiled() {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
  const fingerprint = meetingView(ADRIAN, 'evt-010')?.notesFingerprint
  if (!fingerprint) throw new Error('the notes have a fingerprint')
  ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
}

describe("the README path: no agent claim or letter line contradicts the ledger when it was made", () => {
  it('replays the story, checking after every step', () => {
    const { check, used, count } = checker()
    check('session start: the Brief')

    const intel = store().messages.find((m) => m.kind === 'agent_finding' && m.threadId === 'th-brief' && m.agentId === 'harvest-scanner' && /Intel/.test(m.claim) && /can be sold at a loss today/.test(m.claim))
    if (!intel) throw new Error("The Brief's Intel harvest finding is missing")
    ok(carryFinding(ADRIAN, 'th-brief', intel.id, 'th-johnson-review'))
    ok(runAgent(ADRIAN, 'th-johnson-review', 'drift-monitor'))
    ok(runAgent(ADRIAN, 'th-johnson-review', 'pretrade-check'))
    check('the finding shared, the review thread measured')

    const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
    check('v1')
    ok(reviseProposal(ADRIAN, detail.id, [{ kind: 'harvest_only' }]))
    check('v2')
    const v3 = ok(saveVersion(ADRIAN, detail.id, [{ kind: 'exclude', symbol: 'QAI' }])).detail.versions[2]
    if (!v3) throw new Error('v3 was saved')
    check('v3')
    const { act } = ok(approveProposal(ADRIAN, detail.id, 3, v3.fingerprint, JOHNSON_REASON))
    ok(releaseOrders(MARK, detail.id, act.id, v3.fingerprint, 'Reviewed v3, its legs and its pre-trade check results.', { viaPresenter: { presenterId: ADRIAN } }))
    check('released and filled')

    remeasureBrief()
    check('the Brief after the fills')

    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    check('meeting prep')
    heldDraftedFiled()
    check('the notes, filed')
    const recap = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    check('the recap, drafted')
    ok(sendToParty(ADRIAN, recap.id))
    check('the recap, sent to both')

    expect(count()).toBeGreaterThan(30)
    for (const rule of ['harvest offered', 'realized loss', 'bought today', 'replacement held', 'prep: filled', 'proposal counts working orders',
      'notes: the rebalance', "notes: Patricia's accounts", 'letter: the Intel window', "letter: no trades in Patricia's accounts", 'fills report']) {
      expect(used, `the story never exercised "${rule}"`).toContain(rule)
    }
  })

  it('holds the review before the release: the notes read as a plan, and prep says nothing filled', () => {
    const { check, used } = checker()
    const { detail } = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002'))
    const v1 = detail.versions[0]
    if (!v1) throw new Error('v1 exists')
    ok(approveProposal(ADRIAN, detail.id, 1, v1.fingerprint, JOHNSON_REASON))
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    heldDraftedFiled()
    check('held before the release')
    expect(used).toContain('prep: nothing filled')
    expect(used).toContain('notes: the rebalance')
  })

  it('catches a contradiction: a note that says the morning rebalanced when nothing filled', () => {
    const seen = new Set<string>()
    newClaims(seen)
    ok(holdMeeting(ADRIAN, 'evt-010'))
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    const meeting = store().meetings[0]
    if (!meeting?.notesDraft) throw new Error('the notes are drafted')
    meeting.notesDraft = meeting.notesDraft.map((l) => (l.id === 'n-01' ? { ...l, text: "Reviewed this morning's rebalance and the Intel harvest: the loss is deductible now only if Intel is not bought back before its window closes." } : l))
    expect(disagreements(newClaims(seen), householdLedger('hh-001')).disagreeing).toEqual([
      'notes: the rebalance · notes n-01: the notes say "Reviewed this morning\'s rebalance and the Intel harvest: the loss is deductible now only if Intel is not bought back before its window closes."; the ledger says not_approved',
    ])
  })
})
```

`releaseOrders` takes `ActOptions = { viaPresenter?: ViaPresenter }`, as the presenter's shortcut records it. `runMeetingPrep` and `draftMeetingNotes` are both in `meeting-agents.ts`: merge the two import lines into one.

Run: `pnpm vitest run src/mocks/__tests__/story-replay.test.ts --testTimeout 60000`
Expected: PASS for all three. If the first fails, the message names the step, the claim and the rule: a disagreement is a bug in the agent or the letter (fix it there, with a test in the agent's own file), never in the rule; an unguarded claim either gets a rule here (if it states a trade, a fill or a holding) or is reworded so it does not make one by accident.

- [ ] **Step 3: Every check, commit**

Run the end-of-task checks. Baselines: none move.

```bash
git add src/mocks/__tests__/ledger-claims.ts src/mocks/__tests__/story-replay.test.ts
git commit -m "test(guard): the story replay checks every agent claim and letter line against the household ledger as it stood when made

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---
### Task 15: The README starts from Households; its path, every check, and the preview (spec "README"; Testing)

The home page's first step and the README's path start from Households; the README says what the ledger, the queue and Patricia's conversation enforce; `readme-path.spec.ts` performs the path click for click. Then everything runs. The controller refreshes the preview only after the user approves the branch, and never touches `main`.

**Files:**
- Modify: `src/workspace/shell/home-steps.ts`, `src/workspace/__tests__/home.test.tsx`, `README.md`, `e2e-visual/readme-path.spec.ts`

**Interfaces:**
- Consumes: every earlier task; `bookColumn`, `openThread`, `showConversations` (Task 8); the household page's names (Task 10); `sendLabelOf`'s "Send to Robert and Patricia" (Task 6).
- Produces: the README and the home path.

- [ ] **Step 1: The home path starts from Households**

In `src/workspace/shell/home-steps.ts`, the first step becomes:

```ts
  { id: 'brief', title: 'Your households, then the Brief', detail: "Start where your book stands. Households lists who needs you today and why, the Johnsons first: open their household to see where they stand across every account, then choose Brief for the day's calendar and decisions.", to: '/households/hh-001', linkLabel: 'Open the Johnson household' },
```

the fourth step's detail ends "…and that Intel has left the holdings, the Brief's decisions and the Johnsons' line in Households."; the fifth's ends "…then send the recap to Robert and Patricia, each in their own conversation."; the eighth becomes `{ id: 'view_as', title: 'View as Robert, then Patricia', detail: "See what each client sees: set View as to Robert Johnson · Client, then Patricia Johnson · Client. Each has one conversation, their own, the recap in it, and the truth about who reads it.", to: '/t/th-robert', linkLabel: 'Open his conversation' }`.

In `home.test.tsx`: the first step's link is `{ name: 'Open the Johnson household' }` with `href` `/households/hh-001`.

- [ ] **Step 2: The README**

In `README.md`:
- Step 1 becomes: "**Your households, then the Brief.** The left column, the **Book**, opens on **Households**. **Needs you today** ranks who needs you and why, in one line each; the Johnsons are first: a decision waiting, Robert waiting for a reply, the review at 14:00 ET. Open **Johnson Household**: Robert and Patricia each with their own tolerance and their own accounts as a whole; holdings by asset class against the household target (press **Enter** on **US Equity** to see the accounts holding it, the held-away plans outside the firm's view, and the working order to buy QQQ); what needs a decision, tasks with their owners, the last client contact, and the household's conversations beside it. Then choose **Brief** under **Your day**. **Today** lists the day in Eastern Time: the 14:00 annual review, the 15:30 coffee with Dr. Pell (Form CRS due before it, firm policy) and the open reconciliation break. **Needs a decision** ranks what would change a trade, each with its figure; **Context** holds the rest, folded. The second decision is Growth sitting above Robert Johnson's Moderate tolerance."
- Step 2, first bullet: "…choose **Share to** › **Johnson Rebalance Review**, then switch the Book to **Conversations** and open that thread." Second bullet: "In the context column choose **Ask Proposal Agent**: v1 appears in the thread. It counts the working order to buy QQQ already open in the account as filled."
- Step 4 ends: "…the approval recorded its reason. Switch the Book to **Households**: the Johnsons' decision has dropped off, and the review at 14:00 ET remains."
- Step 5: "…open **Robert Johnson**, choose **Ask Client Letter Agent for the recap** and **Send to Robert and Patricia**. It greets them both and reaches each in their own conversation, as one record."
- Step 8 becomes "**View as Robert, then Patricia.** Set **View as** to Robert Johnson · Client. His header reads Larkfield Advisory and his name. He sees one conversation, his own, titled **Your conversation with Larkfield**, which tells him the Larkfield team reads it and compliance reviews it: his question, the recap and its record, and nothing of the firm's work. Then set **View as** to Patricia Johnson · Client: her own conversation holds the same recap, with her decision, and its record."
- "What it enforces" gains, after **Suitability caught, and recorded.**:
  - "- **One household ledger.** Every agent, letter and screen reads holdings and lots, open orders, the day's fills, realized sales and their windows, and cash from one read model over the session's book (`src/mocks/workspace/household-ledger.ts`). The blotter and the holdings agree in every account (`src/mocks/reference/__tests__/blotter-holdings.test.ts`); a proposal counts the working orders already open and never doubles one; and a story replay checks every agent claim and letter line against the ledger as it stood when it was made (`src/mocks/__tests__/story-replay.test.ts`)."
  - "- **Households first, judged per client.** The Book ranks who needs the advisor today from the engine's own facts (`src/mocks/workspace/household-book.ts`). A household page shows each member against their own tolerance, on their own accounts as a whole; nothing is pooled across a household."
- **Who can see what** gains: "Patricia has her own conversation; a letter to both spouses is one recorded act with a delivery to each, and compliance reviews each delivery."

Check each bold control name against the app (Step 3 clicks it) and that every image path the README names exists (`ls e2e-visual/__baselines__/<name>.png`).

- [ ] **Step 3: The spec performs it**

`e2e-visual/readme-path.spec.ts` (import `bookColumn`, `openThread`, `showConversations`; drop `threadLink`):
- After the home checks, step 1:

```ts
  const queue = bookColumn(page).getByRole('list', { name: 'Needs you today' })
  const johnsonRow = queue.getByRole('link', { name: /^Johnson Household/ })
  await expect(queue.getByRole('link').first()).toHaveAccessibleName(/^Johnson Household/)
  await expect(johnsonRow).toContainText('Decision waiting')
  await expect(johnsonRow).toContainText('review 14:00 ET')
  await johnsonRow.click()
  await expect(heading(page)).toHaveText('Johnson Household')
  const holdings = page.getByRole('main').getByRole('table', { name: 'Holdings by asset class' })
  await holdings.getByRole('row', { name: /^US Equity/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'US Equity · accounts holding it' })).toContainText('working: buy 200 QQQ, limit 480.00')
  await expect(page.getByRole('complementary', { name: 'Conversations' })).toContainText('Johnson Rebalance Review')
  await bookColumn(page).getByRole('link', { name: 'Brief', exact: true }).click()
  await expect(heading(page)).toHaveText('Brief')
```

  then the existing Today and Needs a decision checks.
- Step 2: `await openThread(page, 'Johnson Rebalance Review')`; after v1 appears, `await expect(embed).toContainText('Counts the working order already open in this account as filled: buy 200 QQQ, limit 480.00.')`.
- Step 4: every Brief visit is `openThread(page, 'Brief')`; after the Brief checks:

```ts
  await bookColumn(page).getByRole('button', { name: 'Households' }).click()
  const johnsonNow = bookColumn(page).getByRole('list', { name: 'Needs you today' }).getByRole('link', { name: /^Johnson Household/ })
  await expect(johnsonNow).not.toContainText('Decision waiting')
  await expect(johnsonNow).toContainText('review 14:00 ET')
```

- Step 5: `await openThread(page, 'Robert Johnson')`, and the button `{ name: 'Send to Robert and Patricia' }`; after it, `await expect(context(page).getByRole('region', { name: 'Audit trail' })).toContainText('Message sent to Robert Johnson and Patricia Johnson')`.
- Steps 6 and 7: `openThread` for each thread; `deskLink` reads the Book.
- Step 8, after Robert's checks:

```ts
  await viewAs(page, 'Patricia Johnson · Client')
  const hers = page.getByRole('navigation', { name: 'Threads' }).getByRole('link')
  await expect(hers).toHaveCount(1)
  await hers.click()
  await expect(heading(page)).toHaveText('Your conversation with Larkfield')
  await expect(conversation(page).getByRole('listitem')).toHaveCount(2)
  await expect(conversation(page)).toContainText("We won't trade in Patricia's accounts")
```

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/readme-path.spec.ts`
Expected: PASS. Where it fails, the app, the locator or the order is wrong: fix the app or the locator, or change the order in both the README and the spec; never loosen an assertion.

- [ ] **Step 4: Baselines**

```bash
VISUAL_PORT=5195 pnpm visual:update changed e2e-visual/shell.spec.ts e2e-visual/phone.spec.ts
git status --short e2e-visual/__baselines__
```

Open `home-light`, `home-dark`, `home-mid-story-light` and `phone-home-light`: step 1 reads "Your households, then the Brief" with its link; steps 4, 5 and 8 read as above. Nothing else moves.

- [ ] **Step 5: Everything**

```bash
git status --short                       # only this task's files
pnpm vitest run --testTimeout 30000
TZ=Asia/Tokyo pnpm vitest run src/kit src/lib src/mocks/workspace --testTimeout 30000
pnpm lint && pnpm type-check && pnpm build
pnpm dlx knip@6.39.0 --no-progress       # no output
VISUAL_PORT=5195 pnpm visual             # every scene, axe on each, the stories, the README path
git status --short e2e-visual/__baselines__   # empty: nothing moved in this step
ls e2e-visual/__baselines__ | wc -l           # 69
```

Expected: all green; 69 baselines (60 at `55ab98b`, less `household-light`, plus `patricia-recap-client-light`, `households-light`, `households-dark`, `phone-households-light`, the five household scenes and `agents-light`). `pnpm vitest run src/__tests__/guardrails/retired-words.test.ts` lists "stage trades" as retired and passing. The `TZ=Asia/Tokyo` run proves `easternDayOf`, `fmtWaited` and the ledger's day do not read the machine's zone. Record the suite counts in the report.

- [ ] **Step 6: Commit**

```bash
git add README.md e2e-visual/readme-path.spec.ts src/workspace/shell/home-steps.ts src/workspace/__tests__/home.test.tsx e2e-visual/__baselines__
git commit -m "docs(readme): the five-minute path starts from Households and ends with Patricia's view; the README spec performs it

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: The preview (controller only, after the user approves the branch)**

```bash
pnpm build && pnpm exec wrangler versions upload --preview-alias workspace --tag phase-10 --message "workspace phase 10: household first"
git checkout -- wrangler.jsonc 2>/dev/null; git status --short    # empty
```

Open `https://workspace-advisor-desktop.joel-e-lewis.workers.dev/`: the Book on Households with the Johnsons first; `/households/hh-001` with both members' standing, the class table, and the conversations beside it; `/agents`; View as Patricia. Record the version id wrangler printed. The controller pushes `workspace` only with the user's approval; nothing goes to `main`.

---

## Self-review notes (for the executor)

- **Spec coverage.** §1 Shell → Task 8 (the two modes as a segmented control with `aria-pressed`, keyboard-operable; Households first, the queue then A–Z; rows with name, value, one status line and text markers; remembered per viewer; no switch for outsiders; the phone tab; the Brief in both modes and from home), Task 15 (home's path starts from Households). §2 Queue → Task 7 (the five tiers, a client waiting and how long, ties by age, the empty queue and the A–Z list, firm only, re-derived on every read so acts and clock jumps move it; after the release the decision drops off and the meeting remains), Task 8 (one line per entry with kit figures, opening the household). §3 Household page → Task 9 (the read model: members' standing, managed and held-away values, holdings by class against the value-weighted target with drift and status, accounts per class with held away marked, open orders and today's fills on the holding they change, decisions, tasks and open items with owner and due date, meetings, last contact and anyone waiting, conversations with visibility words, Methods), Task 10 (the page), Task 11 (the conversations column and starting one; firm only). §4 The ledger → Task 1 (the read model, through the session ledger, not a store); every agent reads it → Tasks 3 (Proposal Agent, Pre-trade Check), 4 (Meeting Prep, Meeting Notes), 5 (Harvest Scanner, Drift Monitor, Client Letter, the Brief, and the guard); the consistency fixes → Task 2 (blotter and holdings, a sweep over every account), Task 3 (working orders), Task 4 (notes check what filled; notes agree with Risk), Task 6 (the recap to both spouses as one act with two deliveries; View as Patricia; her decision reaches her); the guard → Task 14. §5 → Tasks 7 and 9 (unanswered client messages), Task 12 (the Agents page, reachable from Firm and the command line; thread Details keep their agents), Task 13 (Practice). Testing → each task's unit tests; the story replay (14); the baselines the spec lists (Households light and dark and phone in 8; the household page before and after, light and dark, and an expanded row in 10; the Agents page in 12; Patricia's view in 6); README and its spec (15).
- **Rulings** are listed before the coverage table: the per-client reading of the household risk line; the engine's figure for Patricia (34, within 26–40) where the brief said 49; which seeds are corrected; what "counts toward the proposal" means; the session day; the three rebalance states; the Harvest Scanner and today's buys; the guard on readers; the recap's two deliveries; the column's name, Book; the Brief in each mode; the queue's words; the household target and band; order words; owners for open items; starting a conversation; "largest clients".
- **Names across tasks.** `easternDayOf` (1); `householdLedger`, `accountLedger`, `HouseholdLedger` and `AccountLedger` (exported in 9), `ticketSide`, `ticketQuantity`, `ticketValue`, `fillsOnDay`, `cashUsd` (1); `ord-017` (2); `WorkingMove`, `workingMovesOf`, `HoldingMove`, `GenerationConstraints.workingOrders`, `PreviewEntry.working`, `WorkingOrderRef`, `'working_order'`, `ProposalViolation.workingOrder`, `CountedWorkingOrder`, `ProposalVersion.workingOrders`, `buildVersion(…, proposalId?)`, `workingOrderWords`, `WorkingOrdersNote` (3); `RebalanceState`, `NotesFacts`, `REBALANCE_LINE`, `draftNotesFromTranscript(eventId, meetingDay, facts)`, `notesFactsOf` (4); `BriefTopic` `bought_today` (5); `PATRICIA_THREAD_ID`, `Delivery`, `BindingAct.deliveries`, `Draft.copies`, `actsReaching`, `sendLabelOf` (6); `QUEUE_TIERS`, `QueueReason`, `HouseholdMarkers`, `HouseholdRow`, `HouseholdBook`, `householdBook` (7); `SegmentedControl`, `fmtWaited`, `BookMode`, `BOOK_MODE_OPTIONS`, `bookModeKey`, `readBookMode`, `storeBookMode`, `useBookMode`, `reasonWords`, `statusLineOf`, `markerWords`, `columnLabelOf`, `phonePaneWords`, `getHouseholdBook`, `useHouseholdBook`, `showConversationsFor`, `bookColumn`, `showConversations`, `openThread` (8); `MemberStanding`, `HoldingOrder`, `ClassHolder`, `AssetClassRow`, `HouseholdHoldings`, `HouseholdDecision`, `HouseholdTask`, `LastContact`, `ClientWaiting`, `HouseholdConversation`, `briefSummaryNow`, `clientsWaiting`, `openAlertsAbout` (9); `holdingOrderWords`, `standingWords`, `ordersCellWords`, `contactWords` (10); `ConversationAudience`, `StartedConversation`, `startConversation`, `useStartConversation`, `conversationChoices`, `useHouseholdConversationsAvailable` (11); `AgentsPage` (12); `concentration.top3Share`, `top5Share` (13); `Claim`, `RULES`, `newClaims`, `disagreements` (14).
- **Counted fixtures.** Seed ids (`th-brief`, `th-johnson-review`, `th-johnson-meeting`, `th-robert`, `th-patricia`, `th-pell`, `acc-001`…`acc-005`, `cli-001`, `cli-002`, `cli-005`, `evt-010`, `ord-003`, `ord-005`, `ord-017`, `comp-002`, `oi-001`, `ha-001`, `ha-002`) assume a fresh store per test, which `src/test/setup.ts` resets after each (it also clears localStorage). Figures pinned from the engine at `55ab98b`: Robert's accounts as a whole 51 and Patricia's 34, both within; the working QQQ order 200 × 480.00 = 96,000; Robert Individual's cash 225,504; the Johnsons' managed value 18,750,000; v1 with the working order 943 SPY sold and 14,454 USD estimated additional tax. A different engine reading is reported, not edited.
