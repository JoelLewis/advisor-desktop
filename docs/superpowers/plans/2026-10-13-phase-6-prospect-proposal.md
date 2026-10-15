# Phase 6: Prospect Proposal and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On branch `workspace`, take the referral Dr. Amanda Pell (`prsp-011`) from first contact to a sent proposal she accepts and an onboarding opened, run by one presenter as Adrian Hale: disclosures delivered as recorded acts at the right moments, scripted agents that profile her and read what she would transfer in, a prospect proposal Adrian revises, approves with a firm-only best-interest record and sends with Form ADV Part 2A — while she sees only her own thread and every firm surface answers her 404 through one external-party predicate.

**Architecture:** One predicate, `isExternalRole` (`src/lib/external-party.ts`), decides who is outside the firm (a client or a prospect); the engine's `isExternalViewer` / `isFirmViewer` and the UI's `viewerIsExternal` are its only callers, and every former `role === 'client'` gate routes through them. External-visible threads carry `partyId` (a client or a prospect id). A session-scoped prospect record (`prospects` and `prospectProposals` inside the workspace store, so `resetWorkspaceStore` resets them) holds her stage, disclosures, steps, statements, proposal versions, approval, sending, acceptance and onboarding checklist. Engine modules under `src/mocks/workspace/` own disclosures (`disclosures.ts`), her steps and the clock jumps (`prospect-steps.ts`), the proposal engine (`prospect-proposals.ts`) and its acts (`prospect-acts.ts`); two new scripted agents (Prospect Profile, Transfer-In) and the Proposal Agent's prospect drafting live in `src/mocks/agents/`. New firm-only endpoints (`handlers/workspace-prospects.ts`) feed her thread's context column, the internal thread "Pell · prospect work", the prospect page `/prospects/:prospectId`, the command line and a Brief line for the next-best action.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, TanStack Query 5, React Router 6 (v7 future flags), MSW 2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-phase-6-prospect-proposal-design.md` (binding). Earlier contracts: the Phase 3–5 specs and plans (`docs/superpowers/plans/2026-10-12-phase-3-rebalance-harvest.md` for versions and approval, `2026-10-12-phase-4-compliance-review.md` for the presenter shortcut and the read-site audit, `2026-10-13-phase-5-meetings.md` for the clock and the shared-contract task), and the Phase 4–5 SDD ledger rulings (wording, provenance, client confidentiality, presenter rules).

## Global Constraints

- Work only on branch `workspace` (base `05e5a0f` or a later `workspace` commit containing every task this one depends on — check `git log --oneline -1` before starting and report BLOCKED if a prerequisite task's commit is missing). Never commit to `main`. Push only when the controller says so.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums; ESM; no barrel files. `.tsx` files export only components; helpers and types go in `.ts` siblings. On macOS's case-insensitive filesystem never place `foo.ts` next to `Foo.tsx`. Errors are explicit types or explicit `throw new Error(...)` naming the broken invariant, never silent catches or silent fallbacks.
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`) and `pnpm build`. A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. Restore `tsconfig.tsbuildinfo` / `wrangler.jsonc` with `git checkout --` if a tool modifies them. Never symlink `node_modules` between worktrees.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`). Tasks 2–3 add Dr. Pell to "View as", two threads to every firm viewer's thread list and two agents to the Desk pane, so every existing baseline that shows the shell drifts from those tasks onward; **only Task 14** regenerates and reviews baselines (`VISUAL_PORT=5195 pnpm visual:update`, then the implementer opens and looks at every PNG it rewrote). Tasks 1–13 do not run `pnpm visual`.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`, a Wednesday), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`). Never read the live clock (`new Date()` / `Date.now()` are banned in `src/mocks` by test; `new Date(<string>)` is fine). Recorded times come from the event clock (`nextAt()`, `eventTime(sequence)`): one minute per event from the frozen now. Phase 4 fills wait for the NYSE open `2026-02-25T14:30:00.000Z`; Phase 5's hold moves to `2026-02-25T20:15:00.000Z`. Phase 6 moves the clock **forward only**: recording the coffee to the end of `evt-004` (`2026-02-25T21:30:00.000Z`), "Advance to her reply" to **Thu 2026-02-26 09:10 ET = `2026-02-26T14:10:00.000Z`** (sequence 1570), "Advance to her acceptance" to **Mon 2026-03-02 10:00 ET = `2026-03-02T15:00:00.000Z`** (sequence 7380). The engine's "today" for tax, holding periods, prices and trading stays `2026-02-25`; prices stay the 25 Feb close and the proposal says "Prices as of 25 Feb 2026 close." Eastern Time is UTC−5 throughout (daylight time starts 2026-03-08).
- Every displayed figure comes from the engine; the UI never computes a figure and formats only through `src/kit/measure.ts`. Agent claims, change summaries and proposal titles contain no digits, except the plan names `401(k)` and `403(b)`. Act summaries, record ids, citations, task due dates, notes a person writes and the client-readable proposal summary are records, not claims: digits allowed (client copy formats money only with `clientMoney`, percentages with `clientPercent`, dates with `clientDate`).
- UI uses only kit components (`src/kit/`) for buttons, tables, dialogs, inputs, selects and checkboxes, and only instrument colour tokens. The guardrails in `src/__tests__/guardrails/` stay green.
- No real person's name. Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002` (client service), Mike Chen `user-003` (analyst), Mark Davis `cco-001` (compliance), Robert Johnson `cli-001` (client viewer), **Dr. Amanda Pell `prsp-011`** (prospect viewer; orthopedic surgeon, 52, married filing jointly, spouse not a party; referred by James Thompson `cli-008`). The firm is the fictional **Larkfield Advisory** (`src/lib/firm.ts`). Nobody but the presenter acts live: Dr. Pell's steps happen on labelled clock jumps (scripted), through "Demo · act as Dr. Pell", or through View as her — every one recorded as `prsp-011` with the firm-only `viaPresenter` marker naming the path. Mark's views are reached through "View as".
- Visibility words exactly: "Only you" / "Firm only · client can't see" / "CLIENT CAN SEE" for client work; "Firm only · prospect can't see" / "PROSPECT CAN SEE" for prospect work. External viewers (clients and prospects) get `404` from every firm surface (meetings, households, clients, proposals, prospects, supervision, archive, presenter, drafts, firm acts, other parties' threads and her internal sibling) and the pages show "not found".
- Domain wording, exactly: never "cleared" (new text); never "would exceed"; a window is stated "through <date>"; wash-sale scope is the **taxpayer**; a rollover appears only as "asked about; comparison to follow" (Reg BI, PTE 2020-02) and nothing recommends one; tax items carry "estimate; consult your tax professional"; state tax is not modelled; long-term rate 23.8% (20% + 3.8% NIIT, `LONG_TERM_RATE`). Form CRS is delivered before or at the first recommendation; Form ADV Part 2A at or before the proposal; Form ADV Part 2B and the privacy notice at onboarding. Onboarding names CIP identity verification, the OFAC screen and the trusted contact (FINRA Rule 4512).
- Task and onboarding due dates are NYSE trading days from `src/lib/trading-calendar.ts`.
- Separation of duties: only the advisor delivers disclosures (`deliver_disclosure`), records the coffee (`prepare_meeting`), approves (`approve_proposal`) and sends (`send_to_party`); only the presenter (`PRESENTER_ID`) uses "Demo · act as Dr. Pell" and the clock jumps; only Dr. Pell (as herself) performs her steps directly. Other firm viewers get `403 NOT_PERMITTED`. Acts are append-only: nothing edits or deletes a recorded act, a delivery, a version or a step (the `405` catch-all stays last).
- Commit messages end with the Co-Authored-By trailer naming the model that wrote the commit (`Co-Authored-By: Claude <that model's name> <noreply@anthropic.com>`, e.g. Sonnet for an implementer, Opus for the controller).

## Review Focus

1. **A repeated or crossing write.** Adrian double-clicks **Deliver Form CRS**, **Send v2 to Dr. Pell**, **Advance to her reply** or **Advance to her acceptance**, or uses the shortcut for a step the jump already performed: one delivery, one send, one questionnaire, one statement share, one acceptance, one onboarding; the second answers `409` (`ALREADY_DELIVERED`, `ALREADY_SENT`, `ALREADY_REPLIED`, `ALREADY_ANSWERED`, `ALREADY_ACCEPTED`) naming the first record, and the clock moved once. Tests: Task 4 (delivery), Task 7 (send), Task 8 (jumps, steps, acceptance), Task 10 (UI double clicks).
2. **A prospect probing the firm.** Dr. Pell (and Robert) request `/threads/th-pell-work`, the other party's thread, `/prospects`, `/prospects/prsp-011`, its proposals, `/meetings`, `/households/hh-001`, `/clients/cli-001`, `/supervision`, `/archive`, `/proposals`, any `/presenter/*`, her own thread's drafts, or post any firm act: `404`, never content; her acts list carries only `send_to_party`, `deliver_disclosure` and `accept_proposal`, stripped of `subject`, `basis`, `bestInterest`, `viaPresenter`, `rationale`, `editedBy`, `messageId`; nothing in her thread names the best-interest record, an agent, Mike or the internal thread. Tests: Task 2 (boundary), Task 9 (HTTP), Task 10 (her view), Task 13 (Mark).
3. **Steps out of the story's order.** Send before Form CRS (`409 FORM_CRS_REQUIRED`, nothing recorded, ADV 2A not delivered); send before approval (`409 NOT_APPROVED`); send when a newer version exists (`409 NEWER_VERSION`); a proposal before her statements (`409 NO_STATEMENTS`) or questionnaire (`409 NO_QUESTIONNAIRE`); her questionnaire before the coffee (`409 COFFEE_FIRST`); ADV 2B or the privacy notice before onboarding (`409 NOT_ONBOARDING`); the acceptance jump before a send (`409 NOT_SENT`); revise or approve after the send (`409 ALREADY_SENT`); Profile or Transfer-In before her reply (one "nothing to read yet" finding, and a rerun after her reply measures). Tests: Tasks 4–8, Task 10 (disabled reasons).
4. **Content that moved after it was read.** Adrian opens the approve dialog on v1, a revision to v2 lands meanwhile, Adrian confirms: `409 NOT_LATEST` ("v2 is newer than v1; review v2 before approving."), nothing approved; a fingerprint that is not the version's: `409 FINGERPRINT_MISMATCH`; a rationale that is blank, padded or over 2,000 characters: `400 BAD_RATIONALE`; Dr. Pell accepts a version other than the sent one: `409 NOT_THE_SENT_VERSION`. Tests: Task 7, Task 8, Task 11.
5. **The clock and the frozen day.** The jumps never move the clock backwards (a jump when the clock is already later records at the later time); after a jump the engine's tax day, holding periods and prices are still 25 Feb; onboarding dues are trading days after the acceptance day (Mon 2 Mar), not after the frozen today; a Johnson release after the coffee answers `409 MARKET_CLOSED`; Mark's "disposed today" reads the session day, so his review on Mon 2 Mar is listed. Tests: Task 8, Task 13.

## Rulings on the spec

These close gaps the spec leaves open; each task below implements them.

- **R1 · One send act.** `send_to_client` is renamed `send_to_party` everywhere (type, permission, archive kind, services, hooks, tests, e2e). It sends either a draft (`{ draftId }`, any external party's thread) or an approved prospect proposal (`{ proposalId }`). Its summary names the party kind ("Message sent to the client" / "Message sent to the prospect"). The permission `draft_for_client` keeps its name (an internal key; it covers any external party).
- **R2 · Who is external.** `isExternalRole(role)` in `src/lib/external-party.ts` is the one predicate; the engine's `isExternalViewer(viewerId)` / `isFirmViewer(viewerId)` (in `visibility.ts`) and the UI's `viewerIsExternal(directory, viewerId)` call it. A source guard fails on any other `role === 'client'` / `role !== 'client'` comparison.
- **R3 · Band words per party.** A thread whose subject is a prospect (her thread and her internal sibling) reads "PROSPECT CAN SEE" / "Firm only · prospect can't see"; every other thread keeps the client words. The thread list's external group is titled "Clients and prospects".
- **R4 · Names.** `ProspectRecord` is the session record (the legacy CRM `Prospect` type stays). `addressNameOf("Dr. Amanda Pell")` is "Dr. Pell" (`firstNameOf` would give "Dr."); drafts and send buttons use it ("Drafts for Dr. Pell", "Send to Dr. Pell"; "Robert" unchanged).
- **R5 · Questionnaire and statements.** Her answers are `RiskAnswer[]` (the onboarding questionnaire's `{ questionId, selectedOption }`), not `Record<string, string>`: eight answers averaging 66 (`moderate_aggressive` → Growth `mod-002`). Her statements are scripted content (`src/mocks/data/prospect-script.ts`), placed on her record only when she shares them; month-end statements as of `2026-01-31`, valued at the 25 Feb close: Fidelity taxable brokerage (SPY 2,800 sh at $520.30, basis $1,010,000 acquired 2016-08-15; Stryker Corp. SYK 1,390 sh at $390.20, basis $61,000 acquired 2008-05-12; cash $100,782 → $2,100,000) and a TIAA 403(b) from her former hospital employer (VTI 2,000 sh, AGG 3,600 sh, cash $8,400 → $900,000). SYK's close lives in `src/mocks/data/held-away-closes.ts` (the book holds no SYK); every other price is `usdQuoteFor`. SYK is 18.1% of her $3,000,000 assets; concentration is a single-name holding above `SINGLE_NAME_LIMIT` (10%) of total assets.
- **R6 · The coffee.** The coffee is not a Meeting record: `POST /api/workspace/prospects/:id/coffee { body }` (advisor only, `prepare_meeting`) moves the clock to the end of `evt-004` (never backwards) and posts a labelled `prospect_note` in the internal thread; once only (`409 ALREADY_RECORDED`). Her questionnaire and statements require it (`409 COFFEE_FIRST`): she answers the questionnaire Adrian handed her at coffee.
- **R7 · Every step of hers is marked.** The demo has one presenter, so every step recorded as Dr. Pell carries `viaPresenter: { presenterId: 'user-001', path }` with `path` `'scripted'` (a clock jump), `'shortcut'` ("Demo · act as Dr. Pell") or `'view_as'` (View as her). A marker without a `path` is the shortcut (Phase 4's compliance records keep that shape). The marker is firm-only.
- **R8 · Stages.** `contact` → `discovery` at her first reply step; → `proposal` when a proposal is sent to her; → `accepted` then `onboarding` in the acceptance step (both recorded in `stageHistory` at the same time).
- **R9 · Prospect proposal versions.** Agent versions only (no workbench edits). The one constraint is `{ kind: 'stage_diversification'; tranches: 2 | 3 }`: the concentrated stock's sale documented as an option in annual tranches with per-tranche gain and tax estimate — nothing sold. "versions" in the spec's API table is `GET /prospects/:id/proposals` (each proposal with every version); `preview` returns what a revision would make, saved nowhere. A revision that changes nothing is `409 NO_CHANGE`.
- **R10 · Fees.** The firm's tiered schedule is `tpl-001` "Comprehensive Wealth Management" (`proposalTemplates[0].feeTiers`, through `blendedTieredFee`); the base is the transferred account's value at the 25 Feb close ($2,100,000 → $20,850 a year, blended 0.99%).
- **R11 · Approval and the best-interest record.** `approve_proposal` on a prospect proposal takes `{ proposalId, version, fingerprint, rationale }`; only the latest version may be approved (`409 NOT_LATEST`: only the latest can be sent); the rationale is Adrian's own words (1–2,000 characters after trimming, else `400 BAD_RATIONALE`); the engine composes the rest of the record (alternatives: the next lower-risk model in the firm's table and staying self-directed, each with its annual cost; the costs; why the model; the concentration; the rollover "asked about; comparison to follow"). Approving another version supersedes the first (its summary says so). Approval also opens the rollover follow-up task once (owner the approver, due five trading days after the approval day).
- **R12 · Sending.** `send_to_party { proposalId }` sends the approved version's `clientSummary` as a text message in her thread; it refuses before Form CRS (`409 FORM_CRS_REQUIRED`), without an approval (`409 NOT_APPROVED`), when a newer version exists (`409 NEWER_VERSION`) and a second time (`409 ALREADY_SENT`). If ADV 2A was not yet delivered, the same act delivers it (`delivers: ['adv_2a']`) and its delivery line precedes the proposal in her thread. The act's `basis` names the proposal, version and version fingerprint; its `fingerprint` is the sent text's (as for letters), so Mark's correspondence review works unchanged.
- **R13 · Disclosures.** One delivery per document per prospect (`409 ALREADY_DELIVERED` naming the act). ADV 2B and the privacy notice are refused before onboarding opens (`409 NOT_ONBOARDING`, a firm workflow rule: "The firm delivers ADV 2B and the privacy notice when onboarding opens."); delivering them updates their checklist items.
- **R14 · Onboarding.** Acceptance opens it once, dated by the acceptance act; items (owner, due as trading days after the acceptance day): individual taxable account application (Sarah, +2), CIP identity verification (Sarah, +2), OFAC screen (Sarah, +1), trusted contact (FINRA 4512) (Sarah, +3), source of funds (Adrian, +3), advisory agreement — awaiting her signature (Adrian, +5), Form ADV Part 2B — deliver; receipt signed with the agreement (Adrian, +1), privacy notice — deliver (Adrian, +1), ACAT transfer — not started (Sarah, no due).
- **R15 · Her steps API.** `POST /prospects/:id/questionnaire { answers? }`, `/statements`, `/accept { version? }` are hers (the prospect herself; firm viewers `403 NOT_HER_STEP`; anyone else `404`); omitted answers mean her scripted answers. `POST /prospects/:id/advance { to: 'reply' | 'acceptance' }` and `POST /presenter/act-as-prospect { prospectId, step }` are the presenter's. `GET /prospects/:id/steps` tells her (and the firm) which of her steps are open.
- **R16 · Endpoints the spec implies.** `GET /api/workspace/prospects` (firm list, for the command line), `GET /prospects/:id/steps`, `POST /prospects/:id/coffee`.
- **R17 · What an external party sees of the record.** `GET /acts` for an external viewer lists only `send_to_party`, `deliver_disclosure` and `accept_proposal` in their own thread, stripped of provenance (`withoutProvenance` also strips `bestInterest`). Her slip reads "Document from Adrian Hale · Form CRS … delivered to you" / "Message from Adrian Hale · Sent to you" / "Acceptance by Dr. Amanda Pell · You accepted the proposal".
- **R18 · The next-best action in the workspace.** NBAs are not otherwise shown in the workspace; the Brief gets a seeded `next_action` line ("Referral: Dr. Amanda Pell") linking to her thread, and `nba-015`'s `actionRoute` becomes `/t/th-pell`.
- **R19 · Archive and supervision name parties.** `ArchiveEntry.clientId/clientName` → `partyId/partyName` (filter "Client or prospect", URL `partyId`); `CorrespondenceItem.clientId/clientName` → `partyId/partyName`. The queue's "disposed today" reads the session day (`sessionNow().slice(0, 10)`), not `MOCK_TODAY_ISO`.
- **R20 · Trading after a jump.** Releasing staged orders after the coffee or a jump answers `409 MARKET_CLOSED` (fills are priced at the frozen 25 Feb session; a later session is out of scope).
- **R21 · Data truth lands on `workspace`**, as Phase 5 Task 1 did; the controller may cherry-pick Task 1 to `main`.
- **R22 · The firm.** "Mitchell Wealth Advisors" and "Sarah Mitchell, CFP, CFA, Senior Wealth Advisor" become the fictional Larkfield Advisory and Adrian Hale (proposal cover, disclosures, settings signature, email-template samples); contact details use the reserved `example` domain.

## Task order, shared contracts and parallelism

| Task | Depends on | Shares files or types with | May run in parallel with |
|---|---|---|---|
| 1 Data truth: Pell, Foster, prospects, the firm, the risk-profile table | — | `prospects.ts` (Task 2 `partyOf`), `nbas.ts` (Task 3), `calendar.ts` (Task 8), `proposals.ts` `toFeeTiers` (Task 6), `src/lib/risk-profile.ts` (Tasks 5–7), `src/lib/firm.ts` | — |
| 2 The external-party boundary: `isExternalRole`, `partyId`, `send_to_party`, band words | 1 | `src/types/workspace.ts` (every later task), `visibility.ts`, `people.ts`, `handlers/workspace.ts`, `workspace-http.ts`, kit `visibility.ts`, `directory-people.ts`, `thread-party.ts`, `words.ts` | — |
| 3 Prospect types, store, seed threads, message kinds and views, NBA link | 2 | `src/types/workspace-prospect.ts` (Tasks 4–13), `workspace-store.ts`, `workspace-seed.ts`, `prospect-seed.ts`, `prospect-script.ts`, `MessageView.tsx`, `act-kind-label.ts`, `ActRecordSlip.tsx` | — |
| 4 Disclosures: `deliver_disclosure` and its rules | 3 | `disclosures.ts` (Tasks 7, 8), `prospects.ts` engine read model | — |
| 5 Prospect Profile and Transfer-In agents | 3 | `agents/prospect-profile.ts`, `agents/transfer-in.ts`, `workspace/transfer-in.ts` (Task 6), `risk-scoring.ts` (Tasks 6–8), `run-key.ts`, `registry.ts`, `people.ts` | 4 |
| 6 The prospect proposal: versions, revise, preview | 5 | `prospect-proposals.ts` (Tasks 7, 9), `agents/prospect-proposal-agent.ts` | 4 |
| 7 Approve with the best-interest record; send to her | 4, 6 | `prospect-acts.ts` (Task 9), `acts.ts`, `correspondence.ts` | — |
| 8 The coffee, her steps, the clock jumps, acceptance, onboarding | 7 | `prospect-steps.ts` (Task 9), `presenter.ts` | — |
| 9 HTTP endpoints, services, hooks | 8 | `handlers/workspace-prospects.ts`, `handlers/workspace.ts`, `services/workspace.ts`, `hooks/use-prospect-work.ts` | — |
| 10 Her thread: context column, her view, the shortcut | 9 | `ProspectPanel.tsx`, `PartyStepsPanel.tsx`, `ContextColumn.tsx`, `DraftsPanel.tsx` | 12 |
| 11 The internal thread: proposal embed, approval, onboarding checklist | 10 | `ProspectProposalEmbed.tsx`, `ProspectApproval.tsx`, `OnboardingChecklist.tsx`, `AskAgents.tsx`, `MessageView.tsx` | 12 |
| 12 The prospect page, the command line, the Brief line | 9 | `routes.tsx`, `ProspectPage.tsx`, `use-destinations.ts`, `FullViews.tsx`, `full-view-href.ts`, `shell-keyboard.test.tsx` | 10, 11 |
| 13 Archive and Supervision for prospect work | 9 | `archive.ts`, `supervision.ts`, `workspace-supervision.ts` types, `ArchivePage.tsx`, `ArchiveTable.tsx`, `CorrespondenceEvidence.tsx` | 10–12 |
| 14 The story end to end, and the visual baselines | all | `e2e-visual/*` | — |

Everything not in the last column is serial. Parallel tasks run in separate worktrees created from a commit that already contains all of their prerequisites; merge them one at a time with the full suite green between merges. Disjoint file lists are not independence: Tasks 5 and 6 both read the prospect record Task 3 defines and Task 4 writes; Tasks 10–12 all touch `MessageView.tsx` or `ContextColumn.tsx` only through the files named. The controller may run everything serially in one checkout instead (the Phase 4 ruling P10).

## The external-party boundary: every gate

Every place that decides "is this viewer outside the firm" today reads `role === 'client'`. Task 2 routes each through one predicate; the table is the audit list and Task 2's tests pin every line.

| # | Site (today) | Gate | After Task 2 |
|---|---|---|---|
| 1 | `src/mocks/workspace/visibility.ts:8` `canSeeThread` | `viewer.role === 'client'` → own client thread only | `isExternalRole(viewer.role)` → `thread.visibility === 'client' && thread.partyId === viewer.id` |
| 2 | `src/mocks/workspace/compliance-acts.ts:158,162` `disposeAlert` | `isClient(viewerId)` | `!isFirmViewer(viewerId)` → 404 |
| 3 | `src/mocks/workspace/compliance-acts.ts:187` `reviewCorrespondence` | `isClient(viewerId)` | `isExternalViewer(viewerId)` → 404 |
| 4 | `src/mocks/workspace/household-views.ts:29-32` `isFirmViewer` (local) | `viewer.role !== 'client'` | import `isFirmViewer` from `visibility.ts` |
| 5 | `src/mocks/workspace/proposal-acts.ts:15` `visibleProposal` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 6 | `src/mocks/workspace/supervision.ts:79` `supervisionQueue` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 7 | `src/mocks/workspace/presenter.ts:25` `actAsCco` | `presenter.role === 'client'` | `!isFirmViewer(presenterId)` |
| 8 | `src/mocks/workspace/proposals.ts:23` `draftingThread` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 9 | `src/mocks/workspace/proposals.ts:130` `readableProposals` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 10 | `src/mocks/workspace/meetings.ts:60` `visibleMeeting` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 11 | `src/mocks/workspace/meetings.ts:77` `meetingSummaries` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 12 | `src/mocks/workspace/meetings.ts:208` `isOwner` | `role !== 'client'` | `isFirmViewer(owner.personId)` |
| 13 | `src/mocks/workspace/archive.ts:57` `archiveFor` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 14 | `src/mocks/workspace/acts.ts:12` `sendToClient` | `isClient` | `sendToParty`: `!isFirmViewer(viewerId)` → 404 |
| 15 | `src/mocks/workspace/letters.ts:16` `draftingClientThread` | `role === 'client'` | `!isFirmViewer(viewerId)` |
| 16 | `src/mocks/handlers/workspace-http.ts:24` `firmViewer` | `role === 'client'` | `!isFirmViewer(viewerId)` → 404 |
| 17 | `src/mocks/handlers/workspace.ts:36` `GET /people` | client → `clientDirectory` | external → `externalDirectory` |
| 18 | `src/mocks/handlers/workspace.ts:62-65` `POST /threads/:id/messages` | `isClient && thread.clientId === viewer` | `isExternalViewer(viewer) && thread.partyId === viewer` |
| 19 | `src/mocks/handlers/workspace.ts:79` `GET /threads/:id/drafts` | `role === 'client'` | `isExternalViewer(viewer)` → 404 |
| 20 | `src/mocks/handlers/workspace.ts:105` `GET /acts` | client → `send_to_client` only, stripped | external → `PARTY_VISIBLE_ACTS`, stripped |
| 21 | `src/mocks/handlers/workspace.ts:114` `POST /acts` | client → 404 first | external → 404 first |
| 22 | `src/workspace/people/directory-people.ts:10` `isClientViewer` (UI) | `p.role === 'client'` | `viewerIsExternal` → `isExternalRole(p.role)`; callers `use-destinations.ts`, `ContextColumn.tsx`, `ArchivePage.tsx`, `ThreadList.tsx`, `SupervisionPage.tsx`, `AccountView.tsx`, `ActRecordSlip.tsx` |

`Thread.clientId` reads that become `partyId`: `workspace-seed.ts` (`th-robert`), `visibility.ts`, `handlers/workspace.ts`, `recap.ts:22,26`, `compliance-acts.ts:195`, `supervision.ts:48`, `archive.ts:31,44`, `draft-staleness.ts:25`, `letters.ts:26`, `composer-mode.ts:16,18`, `ThreadPage.tsx:32-33`, `DraftsPanel.tsx:27-28`, `RecapControl.tsx:22`, `LetterControl.tsx:20`, and every test that builds a thread with `clientId`.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/lib/firm.ts` (new), `src/lib/risk-profile.ts` (new) | 1 | the fictional firm; the risk-profile → model table |
| `src/mocks/data/{calendar,nbas,notes,workflows,activities,documents,prospects,proposals}.ts`, `src/mocks/handlers/{compliance,settings,onboarding}.ts`, `src/types/email-template.ts` | 1 | one Pell story, one Foster story, prospects assigned and dated truly, the firm, the table |
| `src/mocks/data/__tests__/prospect-data-truth.test.ts` (new) | 1 | the data guards |
| `src/lib/external-party.ts` (new), `src/types/workspace.ts`, `src/mocks/workspace/visibility.ts`, `src/mocks/workspace/party.ts` (new) | 2 | the predicate, `partyId`, party lookup |
| every row of the audit table; `src/kit/visibility/*`, `src/workspace/people/{directory-people,role-label,thread-party}.ts`, `src/lib/words.ts` | 2 | the gates, the band words, the address name |
| `src/types/workspace-prospect.ts` (new), `src/mocks/data/{prospect-seed,prospect-script,held-away-closes}.ts` (new), `workspace-store.ts`, `workspace-seed.ts`, `src/mocks/workspace/prospects.ts` (new) | 3 | the record, its seed and script, the store |
| `src/workspace/thread/{NextActionView,DisclosureLine,PartyStepLine,ProspectNoteView,ProspectProposalVersionLine,OnboardingOpenedView}.tsx` (new), `MessageView.tsx`, `act-kind-label.ts`, `act-provenance.ts`, `ActRecordSlip.tsx`, `src/workspace/prospect/prospect-words.ts` (new) | 3 | the new message kinds and act wording |
| `src/mocks/workspace/disclosures.ts` (new) | 4 | `deliver_disclosure` and its rules |
| `src/lib/holding-period.ts` (new), `src/mocks/workspace/{risk-scoring,transfer-in}.ts` (new), `src/mocks/agents/{prospect-profile,transfer-in}.ts` (new), `registry.ts`, `run-key.ts`, `people.ts` | 5 | scoring, the transfer reading, the two agents |
| `src/mocks/agents/prospect-proposal-agent.ts` (new), `src/mocks/workspace/prospect-proposals.ts` (new) | 6 | versions, the client summary, revise, preview |
| `src/mocks/workspace/prospect-acts.ts` (new), `acts.ts` | 7 | approval with the best-interest record; the send |
| `src/mocks/workspace/prospect-steps.ts` (new), `presenter.ts` | 8 | coffee, her steps, jumps, acceptance, onboarding, the shortcut |
| `src/mocks/handlers/workspace-prospects.ts` (new), `handlers/workspace.ts`, `src/services/workspace.ts`, `src/hooks/use-prospect-work.ts` (new) | 9 | endpoints, client functions, hooks |
| `src/workspace/prospect/{ProspectPanel,DisclosureTimeline,ProspectClock,ActAsProspect,SendProposal,PartyStepsPanel}.tsx` (new), `ContextColumn.tsx`, `DraftsPanel.tsx` | 10 | her thread's context (firm and hers) |
| `src/workspace/prospect/{ProspectProposalEmbed,ProspectApproval,OnboardingChecklist,ProspectAgentControl,ProspectWorkPanel}.tsx` (new), `AskAgents.tsx`, `MessageView.tsx` | 11 | the internal thread |
| `src/workspace/prospect/ProspectPage.tsx` (new), `src/app/routes.tsx`, `use-destinations.ts`, `FullViews.tsx`, `full-view-href.ts` | 12 | the prospect page and its ways in |
| `src/mocks/workspace/{archive,supervision}.ts`, `src/types/workspace-supervision.ts`, `src/workspace/archive/*`, `src/workspace/supervision/CorrespondenceEvidence.tsx` | 13 | prospect work in the books and the queue |
| `e2e-visual/workspace-steps.ts`, `e2e-visual/prospect-proposal.spec.ts` (new) | 14 | the story and its baselines |

---

### Task 1: Data truth — one Pell story, one Foster story, prospects assigned and dated truly, the firm, the risk-profile table

The fixtures the prospect story reads must be true before anything reads them. "Dr. Amanda Foster" becomes Dr. Amanda Pell everywhere she appears; William Foster's records tell one story (accounts opened in 2022; February's paperwork is an investor-profile update); every prospect is Adrian's; no prospect action falls on a weekend; `prsp-005`'s referrer is the real `cli-003`; Dr. Pell joins the CRM list as `prsp-011`; the old proposal text's invented firm and Sarah's invented credentials go; and one table maps every questionnaire band to a model that exists.

**Files:**
- Create: `src/lib/firm.ts`, `src/lib/risk-profile.ts`, `src/mocks/data/__tests__/prospect-data-truth.test.ts`
- Modify: `src/mocks/data/calendar.ts:6,36-40`, `src/mocks/data/nbas.ts` (`nba-015`, `nba-019`), `src/mocks/data/notes.ts` (`note-009`, `note-012`), `src/mocks/data/workflows.ts` (`task-004`, `task-020`, `proc-001`), `src/mocks/data/activities.ts` (`act-013`, `act-019`), `src/mocks/data/documents.ts` (`doc-021`, `doc-022`), `src/mocks/handlers/compliance.ts` (`comp-003`), `src/mocks/data/prospects.ts`, `src/mocks/data/proposals.ts:12,111-127,254,286`, `src/mocks/handlers/settings.ts:19`, `src/types/email-template.ts:21-23`, `src/mocks/handlers/onboarding.ts:6-20`, `src/mocks/data/__tests__/meeting-data-truth.test.ts:36`

**Interfaces:**
- Consumes: `MODEL_DEFINITIONS`, `modelDisplayName` from `@/mocks/handlers/pms`; `riskQuestions` from `@/mocks/data/onboarding`.
- Produces (later tasks rely on these exactly):

```ts
// src/lib/firm.ts
export const FIRM_NAME = 'Larkfield Advisory'
export const FIRM_CITY = 'New York, NY'
export const ADVISOR_EMAIL = 'adrian.hale@larkfield.example'

// src/lib/risk-profile.ts
export type RiskProfile = 'conservative' | 'moderate_conservative' | 'moderate' | 'moderate_aggressive' | 'aggressive'
export type ProfileBand = { profile: RiskProfile; label: string; floor: number; ceiling: number; modelId: string }
export const RISK_PROFILE_TABLE: readonly ProfileBand[]
export function bandFor(score: number): ProfileBand
/** The band one step less risky, or undefined for the most conservative. */
export function lowerRiskBand(band: ProfileBand): ProfileBand | undefined

// src/mocks/data/proposals.ts (now exported)
export function toFeeTiers(tiers: readonly ProposalFeeTier[]): FeeTier[]
```

- [ ] **Step 1: Write the failing guards**

Create `src/mocks/data/__tests__/prospect-data-truth.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { calendarEvents } from '@/mocks/data/calendar'
import { nbas } from '@/mocks/data/nbas'
import { notes } from '@/mocks/data/notes'
import { tasks, processTrackers } from '@/mocks/data/workflows'
import { activities } from '@/mocks/data/activities'
import { documents } from '@/mocks/data/documents'
import { prospects } from '@/mocks/data/prospects'
import { clients } from '@/mocks/data/clients'
import { accounts } from '@/mocks/data/accounts'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { MODEL_DEFINITIONS } from '@/mocks/handlers/pms'
import { RISK_PROFILE_TABLE, bandFor, lowerRiskBand } from '@/lib/risk-profile'
import { FIRM_NAME } from '@/lib/firm'

const easternWeekday = (iso: string) => new Date(Date.parse(iso) - 5 * 3_600_000).getUTCDay()
const isWeekend = (iso: string) => [0, 6].includes(easternWeekday(iso.length === 10 ? `${iso}T17:00:00Z` : iso))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('Dr. Amanda Pell, the referral', () => {
  it('no source names Dr. Amanda Foster', () => {
    for (const file of sourceFiles('src')) expect(readFileSync(file, 'utf8'), file).not.toMatch(/Amanda Foster/)
  })

  it('evt-004 is her coffee with Adrian this afternoon, after the Johnson review', () => {
    expect(calendarEvents.find((e) => e.id === 'evt-004')).toMatchObject({
      title: 'Coffee — Dr. Amanda Pell (prospect)', meetingType: 'prospect',
      startTime: '2026-02-25T15:30:00-05:00', endTime: '2026-02-25T16:30:00-05:00', attendees: ['user-001'],
    })
  })

  it('names her in nba-015, note-009, task-004 and act-019, each crediting James Thompson', () => {
    const texts = [
      nbas.find((n) => n.id === 'nba-015')?.description, notes.find((n) => n.id === 'note-009')?.content,
      tasks.find((t) => t.id === 'task-004')?.description, activities.find((a) => a.id === 'act-019')?.description,
    ]
    for (const text of texts) {
      expect(text).toContain('Dr. Amanda Pell')
      expect(text).toMatch(/James/)
    }
  })

  it('is prospect prsp-011 in the CRM: a referral from cli-008, assigned to Adrian Hale', () => {
    expect(prospects.find((p) => p.id === 'prsp-011')).toMatchObject({
      name: 'Dr. Amanda Pell', source: 'referral', stage: 'lead', assignedAdvisor: 'Adrian Hale', estimatedAUM: 3_000_000,
    })
  })

  it('task-004 is due on a weekday', () => {
    expect(tasks.find((t) => t.id === 'task-004')?.dueDate).toBe('2026-02-27')
  })
})

describe('William Foster, one story', () => {
  const foster = 'cli-017'
  it('his accounts were opened in 2022', () => {
    for (const a of accounts.filter((x) => x.clientId === foster)) expect(a.openDate.slice(0, 4), a.id).toBe('2022')
  })

  it('no record about him describes a new account or its opening', () => {
    const texts = [
      ...tasks.filter((t) => t.clientId === foster).flatMap((t) => [t.title, t.description]),
      ...processTrackers.filter((p) => p.entityId === foster).flatMap((p) => [p.entityName, ...p.stages.map((s) => s.name)]),
      ...documents.filter((d) => d.clientId === foster).map((d) => d.name),
      ...notes.filter((n) => n.clientId === foster).map((n) => n.content),
      ...activities.filter((a) => a.entityId === foster).flatMap((a) => [a.title, a.description]),
      ...complianceAlerts.filter((c) => c.entityId === foster).flatMap((c) => [c.title, c.description]),
      ...nbas.filter((n) => n.clients.some((c) => c.id === foster)).flatMap((n) => [n.title, n.description, n.trigger.value, n.actionRoute?.aiMessage ?? '']),
    ]
    expect(texts.length).toBeGreaterThan(8)
    for (const text of texts) expect(text).not.toMatch(/account opening|new (individual )?brokerage|opened Feb|initial deposit|account application|Account Activated|Custodian Setup/i)
  })
})

describe('prospects', () => {
  it('are all assigned to Adrian Hale, the advisor', () => {
    for (const p of prospects) expect(p.assignedAdvisor, p.id).toBe('Adrian Hale')
  })

  it('have no next action on a weekend', () => {
    for (const p of prospects) expect(isWeekend(p.nextActionDate), `${p.id} ${p.nextActionDate}`).toBe(false)
  })

  it('name only real clients as referrers, by their own names', () => {
    const named = prospects.flatMap((p) => [p.notes ?? '', ...p.activities.map((a) => a.description)])
      .flatMap((text) => [...text.matchAll(/Referred by ([^()]+?) \((cli-\d{3})\)/g)])
    expect(named.length).toBeGreaterThanOrEqual(5)
    for (const [, name, id] of named) expect(clients.find((c) => c.id === id)?.fullName, `${name} (${id})`).toBe(name)
  })
})

describe('the firm', () => {
  it('no source names the invented "Mitchell Wealth Advisors" or gives Sarah Mitchell advisor credentials', () => {
    for (const file of sourceFiles('src')) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/Mitchell Wealth|mitchellwealth|Sarah Mitchell, CFP/)
    }
  })

  it('is the fictional Larkfield Advisory', () => {
    expect(FIRM_NAME).toBe('Larkfield Advisory')
  })
})

describe('the risk-profile table', () => {
  it('maps every band to a model that exists', () => {
    for (const band of RISK_PROFILE_TABLE) expect(MODEL_DEFINITIONS.some((m) => m.id === band.modelId), band.profile).toBe(true)
  })

  it('covers every score from 0 to 100 exactly once, in order of risk', () => {
    expect(RISK_PROFILE_TABLE[0]?.floor).toBe(0)
    expect(RISK_PROFILE_TABLE[RISK_PROFILE_TABLE.length - 1]?.ceiling).toBe(100)
    for (let i = 1; i < RISK_PROFILE_TABLE.length; i++) expect(RISK_PROFILE_TABLE[i]?.floor).toBe((RISK_PROFILE_TABLE[i - 1]?.ceiling ?? -1) + 1)
  })

  it('puts more in stocks as the band gets riskier', () => {
    const equity = (modelId: string) => (MODEL_DEFINITIONS.find((m) => m.id === modelId)?.assetClasses ?? [])
      .filter((a) => ['us_equity', 'intl_equity', 'emerging_markets'].includes(a.assetClass)).reduce((s, a) => s + a.targetWeight, 0)
    const shares = RISK_PROFILE_TABLE.map((b) => equity(b.modelId))
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan(shares[i - 1] ?? 1)
  })

  it('reads a score into its band, and a band into the next lower-risk one', () => {
    expect(bandFor(66)).toMatchObject({ profile: 'moderate_aggressive', modelId: 'mod-002' })
    expect(bandFor(25).profile).toBe('conservative')
    expect(bandFor(26).profile).toBe('moderate_conservative')
    expect(lowerRiskBand(bandFor(66))?.modelId).toBe('mod-001')
    expect(lowerRiskBand(bandFor(0))).toBeUndefined()
    expect(() => bandFor(101)).toThrow('score 101')
  })

  it('the onboarding questionnaire recommends the table\'s model, by its name', async () => {
    const res = await fetch('/api/onboarding/calculate-risk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [{ questionId: 'rq-01', selectedOption: 4 }, { questionId: 'rq-02', selectedOption: 2 }, { questionId: 'rq-03', selectedOption: 3 },
        { questionId: 'rq-04', selectedOption: 4 }, { questionId: 'rq-05', selectedOption: 2 }, { questionId: 'rq-06', selectedOption: 2 },
        { questionId: 'rq-07', selectedOption: 2 }, { questionId: 'rq-08', selectedOption: 2 }] }),
    })
    expect(await res.json()).toEqual({ score: 66, profile: 'moderate_aggressive', label: 'Moderate Aggressive', recommendedModel: 'Growth' })
  })
})
```

- [ ] **Step 2: Run the guards to see them fail**

Run: `pnpm vitest run src/mocks/data/__tests__/prospect-data-truth.test.ts --testTimeout 30000`
Expected: FAIL — `@/lib/risk-profile` and `@/lib/firm` do not exist.

- [ ] **Step 3: The firm and the table**

Create `src/lib/firm.ts`:

```ts
/** The fictional firm the demo's advisors work for. No real firm's name, address or domain (the `example` domain is reserved). */
export const FIRM_NAME = 'Larkfield Advisory'
export const FIRM_CITY = 'New York, NY'
export const ADVISOR_EMAIL = 'adrian.hale@larkfield.example'
```

Create `src/lib/risk-profile.ts`:

```ts
export type RiskProfile = 'conservative' | 'moderate_conservative' | 'moderate' | 'moderate_aggressive' | 'aggressive'
export type ProfileBand = { profile: RiskProfile; label: string; floor: number; ceiling: number; modelId: string }

/**
 * Firm policy: the questionnaire's average score, read into a band, names the firm model for it. The
 * one table every surface reads (the onboarding questionnaire, the Prospect Profile agent, the
 * proposal, its best-interest record). Bands are inclusive and cover 0–100; models get riskier with
 * the band (equity 25%, 50%, 55%, 75%, 80%).
 */
export const RISK_PROFILE_TABLE: readonly ProfileBand[] = [
  { profile: 'conservative', label: 'Conservative', floor: 0, ceiling: 25, modelId: 'mod-003' },
  { profile: 'moderate_conservative', label: 'Moderate Conservative', floor: 26, ceiling: 40, modelId: 'mod-007' },
  { profile: 'moderate', label: 'Moderate', floor: 41, ceiling: 55, modelId: 'mod-001' },
  { profile: 'moderate_aggressive', label: 'Moderate Aggressive', floor: 56, ceiling: 75, modelId: 'mod-002' },
  { profile: 'aggressive', label: 'Aggressive', floor: 76, ceiling: 100, modelId: 'mod-004' },
]

export function bandFor(score: number): ProfileBand {
  const band = RISK_PROFILE_TABLE.find((b) => score >= b.floor && score <= b.ceiling)
  if (!band) throw new Error(`No risk band holds score ${score}`)
  return band
}

export function lowerRiskBand(band: ProfileBand): ProfileBand | undefined {
  const i = RISK_PROFILE_TABLE.findIndex((b) => b.profile === band.profile)
  return i > 0 ? RISK_PROFILE_TABLE[i - 1] : undefined
}
```

Replace `calculateRiskProfile` in `src/mocks/handlers/onboarding.ts` (lines 6–20) with:

```ts
function calculateRiskProfile(answers: { questionId: string; selectedOption: number }[]): RiskResult {
  const totalScore = answers.reduce((sum, a) => {
    const question = riskQuestions.find((q) => q.id === a.questionId)
    if (!question || a.selectedOption >= question.options.length) return sum
    return sum + (question.options[a.selectedOption]?.score ?? 0)
  }, 0)
  const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 50
  // The firm's one table names the model; the label is the model's own name, never an invented blend.
  const band = bandFor(avgScore)
  return { score: avgScore, profile: band.profile, label: band.label, recommendedModel: modelDisplayName(band.modelId) }
}
```

and add the imports `import { bandFor } from '@/lib/risk-profile'` and `import { modelDisplayName } from './pms'`.

- [ ] **Step 4: One Pell story**

In `src/mocks/data/calendar.ts`, change the file comment's "and the Foster meeting" to "and Dr. Pell's coffee", and replace `evt-004` with:

```ts
  {
    id: 'evt-004', title: 'Coffee — Dr. Amanda Pell (prospect)',
    meetingType: 'prospect',
    startTime: '2026-02-25T15:30:00-05:00', endTime: '2026-02-25T16:30:00-05:00',
    location: 'Blue Bottle Coffee', notes: 'Referral from James Thompson; bring the risk questionnaire.', prepCompleted: false, attendees: ['user-001'],
  },
```

In `src/mocks/data/__tests__/meeting-data-truth.test.ts:36` rename the test to `'holds the Johnson annual review this afternoon, between the Patel call and Dr. Pell\'s coffee, overlapping nothing'` (the assertions stay).

In `src/mocks/data/nbas.ts` replace `nba-015`'s text fields (the `actionRoute` stays `{ path: '/' }` until Task 3 seeds her thread):

```ts
    id: 'nba-015', title: 'Referral: Dr. Amanda Pell',
    description: 'James Thompson introduced his colleague Dr. Amanda Pell (orthopedic surgeon, about $3M investable) on Feb 20. Coffee with Adrian Hale today at 15:30 ET.',
    // … category, priority, scoring, clients unchanged …
    trigger: { source: 'crm', condition: 'referral_mention', value: 'Dr. Amanda Pell — ~$3M', detectedAt: '2026-02-20T14:00:00Z' },
    suggestedAction: 'Deliver Form CRS before the coffee; send James a thank-you note',
    estimatedImpact: 22_500, createdAt: '2026-02-20T14:15:00Z', dismissed: false,
    actionRoute: { path: '/' },
```

In `src/mocks/data/notes.ts` `note-009`: `content: 'James referred Dr. Amanda Pell — sent her contact details by email. Coffee with Adrian on Feb 25.'`.

In `src/mocks/data/workflows.ts` `task-004`: `description: 'James Thompson referred Dr. Amanda Pell. Coffee with Adrian Hale on Feb 25 at 15:30 ET; send James a thank-you note.'`, `dueDate: '2026-02-27'`.

In `src/mocks/data/activities.ts` `act-019`: `description: 'James Thompson sent contact details for Dr. Amanda Pell.'`.

- [ ] **Step 5: One Foster story**

William Foster has been a client since 2022 (`createdAt: '2022-06-10'`, `acc-037` opened 2022-07-01, `acc-038` 2022-07-15). February's paperwork is his investor-profile update; the expected deposit is an additional contribution.

- `workflows.ts` `task-020`: `title: 'Process Foster investor profile update'`, `description: 'Updated investor profile form uploaded. Complete the suitability review and file it.'`, `category: 'compliance'` (other fields unchanged).
- `workflows.ts` `proc-001`:

```ts
  {
    id: 'proc-001', type: 'compliance_review', entityId: 'cli-017', entityName: 'William Foster — Investor Profile Update',
    currentStage: 2, startedAt: '2026-02-22T11:00:00Z', estimatedCompletion: '2026-02-27T17:00:00Z', isNigo: false,
    stages: [
      { step: 1, name: 'Profile Form Received', status: 'completed', responsibleParty: 'Client', slaHours: 0, startedAt: '2026-02-22T11:00:00Z', completedAt: '2026-02-22T11:00:00Z' },
      { step: 2, name: 'Suitability Review', status: 'in_progress', responsibleParty: 'Lisa Park (CSA)', slaHours: 24, startedAt: '2026-02-22T14:00:00Z', completedAt: null },
      { step: 3, name: 'Compliance Approval', status: 'pending', responsibleParty: 'Compliance', slaHours: 48, startedAt: null, completedAt: null },
      { step: 4, name: 'Profile Updated', status: 'pending', responsibleParty: 'System', slaHours: 4, startedAt: null, completedAt: null },
    ],
  },
```

- `documents.ts` `doc-021`: `name: 'William Foster — Investor Profile Update'`, `type: 'compliance'`, `fileUrl: '/docs/foster-profile-update.pdf'`; `doc-022`: `name: 'Compliance Review — Foster Suitability Update'`.
- `notes.ts` `note-012`: `content: 'William updated his investor profile (risk tolerance and experience). Form uploaded; pending the compliance suitability review.'`.
- `activities.ts` `act-013`: `title: 'New document uploaded — Foster investor profile update'`, `description: 'William Foster uploaded an updated investor profile form. Pending review.'`.
- `handlers/compliance.ts` `comp-003`: `title: 'Suitability review — Foster profile update'`, `description: 'William Foster updated his investor profile. Risk tolerance assessment and investment experience verification needed before the profile is filed.'`.
- `nbas.ts` `nba-019`:

```ts
    id: 'nba-019', title: 'Expected deposit not received — Foster brokerage',
    description: "William Foster told us on Feb 15 to expect a $200K deposit into his individual brokerage account (open since 2022); it has not arrived after 10 days.",
    // … category, priority, scoring, clients unchanged …
    trigger: { source: 'custodian', condition: 'expected_deposit_missing', value: 'Expected $200K — 10 days', detectedAt: '2026-02-25T08:00:00Z' },
    suggestedAction: 'Contact William to verify wire details; check with custodian',
    estimatedImpact: 200_000, createdAt: '2026-02-25T08:15:00Z', dismissed: false,
    actionRoute: { path: '/accounts/acc-037', openAI: true, aiMessage: 'Draft a follow-up email to William Foster about the expected $200K deposit into his individual brokerage account. Verify wire details.' },
```

and its audit-trail note `'Expected deposit not received after 10 days'`.

- [ ] **Step 6: Prospects assigned and dated truly; Dr. Pell joins the list**

In `src/mocks/data/prospects.ts`: replace every `assignedAdvisor: 'Sarah Mitchell'` with `assignedAdvisor: 'Adrian Hale'` (ten lines). Move weekend next actions to the nearest weekday: `prsp-001` `'2026-02-28T10:00:00Z'` → `'2026-02-27T15:00:00Z'`; `prsp-002` `'2026-03-01T14:00:00Z'` → `'2026-03-02T14:00:00Z'`; `prsp-007` `'2026-03-01T15:00:00Z'` → `'2026-03-02T16:00:00Z'`; `prsp-008` `'2026-02-28T14:00:00Z'` → `'2026-02-27T14:00:00Z'`. In `prsp-005` `act-008` replace `'Referred by Michael Chen (cli-003) — initial phone screen'` with `'Referred by Margaret Chen (cli-003) — initial phone screen'`. Append after `prsp-010`:

```ts

  // ── Referral this week (Phase 6) ──
  {
    id: 'prsp-011',
    name: 'Dr. Amanda Pell',
    email: 'amanda.pell@example.com',
    phone: '(303) 555-0190',
    estimatedAUM: 3_000_000,
    source: 'referral',
    stage: 'lead',
    probability: 0.3,
    assignedAdvisor: 'Adrian Hale',
    nextAction: 'Coffee with Adrian Hale',
    nextActionDate: '2026-02-25T20:30:00Z',
    activities: [
      { id: 'act-027', type: 'email', description: 'Referred by James Thompson (cli-008) — contact details received', date: '2026-02-20T14:30:00Z' },
    ],
    createdAt: '2026-02-20T14:30:00Z',
    stageChangedAt: '2026-02-20T14:30:00Z',
    notes: 'Orthopedic surgeon, 52, married filing jointly (spouse not a party). A taxable brokerage account and a 403(b) from a former hospital employer.',
  },
```

- [ ] **Step 7: The firm in the old proposal text, settings and templates**

In `src/mocks/data/proposals.ts` export `toFeeTiers` (`export function toFeeTiers(...)`, line 12), import `{ ADVISOR_EMAIL, FIRM_CITY, FIRM_NAME } from '@/lib/firm'`, and replace the cover page lines 111–127 with:

```ts
        '**Prepared by:** Adrian Hale',
        '',
        '**Wealth Advisor**',
        '',
        '---',
        '',
        `**${FIRM_NAME}**`,
        '',
        FIRM_CITY,
        '',
        'Tel: (212) 555-0142',
        `Email: ${ADVISOR_EMAIL}`,
        '',
        '---',
        '',
        `*This proposal is confidential and intended solely for the named recipient. It contains proprietary investment recommendations tailored to your specific financial situation, objectives, and risk tolerance. Please do not distribute without prior written consent from ${FIRM_NAME}.*`,
```

Line 254: `` `- **${FIRM_NAME}:** Our tiered structure ensures fees decrease as your assets grow` ``. Line 286: `` `${FIRM_NAME} is a registered investment adviser. Registration does not imply a certain level of skill or training. A copy of our current Form ADV Part 2A (Firm Brochure) and Part 2B (Brochure Supplement) is available upon request or at [adviserinfo.sec.gov](https://adviserinfo.sec.gov).` ``.

In `src/mocks/handlers/settings.ts:19`: `` emailSignature: `Best regards,\n{advisor_name}\nWealth Advisor\n${FIRM_NAME}` `` (import `FIRM_NAME`). In `src/types/email-template.ts`: `advisor.name` sample `'Adrian Hale'`, `advisor.title` sample `'Wealth Advisor'`, `advisor.firm` sample `FIRM_NAME` (import it).

- [ ] **Step 8: Run the guards and the suites that read these fixtures**

Run: `pnpm vitest run src/mocks/data/__tests__/ src/mocks/handlers/__tests__/ --testTimeout 30000`
Expected: PASS. If a legacy test pins a changed string (the proposal cover, a Foster title, an NBA title), update the test's expected string to the new fixture text — never the fixture back.

- [ ] **Step 9: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add src/lib/firm.ts src/lib/risk-profile.ts src/mocks/data src/mocks/handlers/compliance.ts src/mocks/handlers/settings.ts src/mocks/handlers/onboarding.ts src/types/email-template.ts
git commit -m "fix(data): Dr. Amanda Pell, one Foster story, prospects assigned to Adrian, the firm, the risk-profile table

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 2: The external-party boundary — one predicate, `partyId`, `send_to_party`, band words that name the party

Dr. Pell becomes a person in the directory with the role `prospect` and no permissions. Every gate in the audit table above stops asking "is this a client?" and asks the one predicate whether the viewer is outside the firm. Threads an outsider can see carry `partyId`. The send act is renamed for every party. The visibility band names the party. After this task a prospect and a client are treated identically by every firm surface (404) and each sees only their own thread.

**Files:**
- Create: `src/lib/external-party.ts`, `src/mocks/workspace/party.ts`, `src/workspace/people/thread-party.ts`, `src/lib/__tests__/external-party.test.ts`, `src/mocks/workspace/__tests__/pell-threads.ts`, `src/mocks/workspace/__tests__/external-boundary.test.ts`, `src/mocks/handlers/__tests__/external-boundary-api.test.ts`
- Modify: `src/types/workspace.ts` (`Role`, `Subject`, `Thread`, `BindingActKind`), `src/mocks/data/people.ts`, `src/mocks/data/workspace-seed.ts` (`th-robert`), every site in the audit table, `src/mocks/workspace/acts.ts` (`sendToParty`), `src/kit/visibility/visibility.ts`, `src/kit/visibility/VisibilityBand.tsx`, `src/workspace/people/directory-people.ts`, `src/workspace/people/role-label.ts`, `src/workspace/shell/ThreadList.tsx`, `src/workspace/thread/ThreadPage.tsx`, `src/workspace/thread/composer-mode.ts`, `src/workspace/thread/Composer.tsx`, `src/workspace/context/DraftsPanel.tsx`, `src/workspace/thread/act-kind-label.ts`, `src/lib/words.ts`, and the tests the sweep in Step 5 names
- Test: the three new test files; `src/kit/__tests__/VisibilityBand.test.tsx`, `src/lib/__tests__/words.test.ts`, `src/mocks/data/__tests__/people.test.ts`, `src/workspace/__tests__/shell.test.tsx`

**Interfaces:**
- Consumes: `prospects` (`prsp-011`, Task 1), `clients`.
- Produces:

```ts
// src/lib/external-party.ts
export type PartyKind = 'client' | 'prospect'
export const isExternalRole: (role: Role) => role is PartyKind

// src/types/workspace.ts (changed lines)
export type Role = 'advisor' | 'csa' | 'analyst' | 'compliance' | 'client' | 'prospect'
export type Subject = { type: 'account' | 'household' | 'client' | 'prospect' | 'draft' | 'proposal' | 'alert' | 'message' | 'meeting'; id: string }
export type Thread = { id: string; title: string; visibility: Visibility; ownerId?: string; partyId?: string; memberIds: string[]; agentIds: AgentId[]; subject?: Subject }
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'send_to_party' | 'file_meeting_record' | ComplianceActKind

// src/mocks/workspace/visibility.ts
export function isExternalViewer(viewerId: string): boolean
export function isFirmViewer(viewerId: string): boolean
export function canSeeThread(viewerId: string, thread: Thread): boolean      // external: thread.visibility === 'client' && thread.partyId === viewer
export function visibleThreads(viewerId: string): Thread[]
export function viewerFrom(request: Request): string | undefined

// src/mocks/workspace/party.ts
export type Party = { id: string; kind: PartyKind; name: string }
export function partyOf(partyId: string): Party | undefined
export function partyOfThread(thread: Thread): Party                          // throws for a client-visible thread without a known party

// src/mocks/workspace/acts.ts (renamed)
export function sendToParty(viewerId: string, draftId: string): { ok: true; act: BindingAct } | Failure

// src/kit/visibility/visibility.ts
export type Party = 'client' | 'prospect'
export function visibilityWords(visibility: Visibility, party?: Party): string
// src/kit/visibility/VisibilityBand.tsx: props gain `party?: Party` (default 'client')

// src/workspace/people/directory-people.ts (renamed)
export const isExternalViewerIn: (directory: Directory, viewerId: string) => boolean
// src/workspace/people/thread-party.ts
export const threadParty: (thread: Thread) => PartyKind
// src/lib/words.ts
export function addressNameOf(fullName: string): string                       // "Dr. Amanda Pell" → "Dr. Pell"; "Robert Johnson" → "Robert"
// src/services/workspace.ts: sendToClient → sendToParty; src/hooks/use-workspace.ts: useSendToClient → useSendToParty
// src/workspace/thread/composer-mode.ts: { kind: 'draft'; addressName: string } (was clientFirstName)
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/external-party.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isExternalRole } from '@/lib/external-party'

describe('isExternalRole', () => {
  it.each([['client', true], ['prospect', true], ['advisor', false], ['csa', false], ['analyst', false], ['compliance', false]] as const)(
    '%s → %s', (role, expected) => expect(isExternalRole(role)).toBe(expected))
})
```

Create `src/mocks/workspace/__tests__/pell-threads.ts` (Task 3 seeds these threads; until then tests add them, and afterwards this is a no-op):

```ts
import { store } from '@/mocks/data/workspace-store'

/** Dr. Pell's thread and its internal sibling, as Task 3 seeds them. Idempotent. */
export function ensurePellThreads(): void {
  const s = store()
  if (!s.threads.some((t) => t.id === 'th-pell')) {
    s.threads.push({ id: 'th-pell', title: 'Dr. Amanda Pell', visibility: 'client', partyId: 'prsp-011', memberIds: ['prsp-011', 'user-001', 'user-002'],
      agentIds: [], subject: { type: 'prospect', id: 'prsp-011' } })
  }
  if (!s.threads.some((t) => t.id === 'th-pell-work')) {
    s.threads.push({ id: 'th-pell-work', title: 'Pell · prospect work', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
      agentIds: [], subject: { type: 'prospect', id: 'prsp-011' } })
  }
}
```

Create `src/mocks/workspace/__tests__/external-boundary.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { store } from '@/mocks/data/workspace-store'
import { canSeeThread, isExternalViewer, isFirmViewer, visibleThreads } from '../visibility'
import { meetingSummaries, visibleMeeting } from '../meetings'
import { clientView, householdView } from '../household-views'
import { supervisionQueue } from '../supervision'
import { archiveFor } from '../archive'
import { createProposal, readableProposals } from '../proposals'
import { visibleProposal } from '../proposal-acts'
import { actAsCco } from '../presenter'
import { draftingClientThread } from '../letters'
import { sendToParty } from '../acts'
import { disposeAlert, reviewCorrespondence } from '../compliance-acts'
import { partyOf, partyOfThread } from '../party'
import { ensurePellThreads } from './pell-threads'

const PELL = 'prsp-011'
const ROBERT = 'cli-001'
const ADRIAN = 'user-001'
const EXTERNAL = [PELL, ROBERT] as const
const thread = (id: string) => {
  const t = store().threads.find((x) => x.id === id)
  if (!t) throw new Error(`no thread ${id}`)
  return t
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

beforeEach(ensurePellThreads)

describe('who is outside the firm', () => {
  it.each([[PELL, true], [ROBERT, true], [ADRIAN, false], ['cco-001', false], ['nobody', false]] as const)(
    'isExternalViewer(%s) is %s', (id, expected) => expect(isExternalViewer(id)).toBe(expected))
  it.each([[PELL, false], [ROBERT, false], [ADRIAN, true], ['user-003', true], ['nobody', false]] as const)(
    'isFirmViewer(%s) is %s', (id, expected) => expect(isFirmViewer(id)).toBe(expected))
  it('names each party by kind', () => {
    expect(partyOf(PELL)).toEqual({ id: PELL, kind: 'prospect', name: 'Dr. Amanda Pell' })
    expect(partyOf(ROBERT)).toEqual({ id: ROBERT, kind: 'client', name: 'Robert Johnson' })
    expect(partyOf('nobody')).toBeUndefined()
    expect(partyOfThread(thread('th-pell')).kind).toBe('prospect')
  })
})

describe('each party sees only their own thread', () => {
  it("Dr. Pell sees her thread — not Robert's, not her internal sibling", () => {
    expect(visibleThreads(PELL).map((t) => t.id)).toEqual(['th-pell'])
    expect(canSeeThread(PELL, thread('th-robert'))).toBe(false)
    expect(canSeeThread(PELL, thread('th-pell-work'))).toBe(false)
  })
  it('Robert does not see hers', () => {
    expect(visibleThreads(ROBERT).map((t) => t.id)).toEqual(['th-robert'])
    expect(canSeeThread(ROBERT, thread('th-pell'))).toBe(false)
  })
  it('the firm members see both; compliance supervises both; Mike, not a member of hers, does not see it', () => {
    for (const id of ['th-pell', 'th-pell-work', 'th-robert']) expect(canSeeThread('cco-001', thread(id)), id).toBe(true)
    expect(canSeeThread(ADRIAN, thread('th-pell'))).toBe(true)
    expect(canSeeThread('user-003', thread('th-pell'))).toBe(false)
    expect(canSeeThread('user-003', thread('th-pell-work'))).toBe(true)
  })
})

describe('every firm gate answers an external viewer as if nothing were there', () => {
  it.each(EXTERNAL)('%s gets nothing from any firm surface', (viewer) => {
    expect(visibleMeeting(viewer, 'evt-010')).toBeUndefined()
    expect(meetingSummaries(viewer)).toBeUndefined()
    expect(householdView(viewer, 'hh-001')).toBeUndefined()
    expect(clientView(viewer, 'cli-001')).toBeUndefined()
    expect(supervisionQueue(viewer)).toBeUndefined()
    expect(archiveFor(viewer, {})).toBeUndefined()
    expect(readableProposals(viewer)).toBeUndefined()
    expect(readableProposals(viewer, viewer === PELL ? 'th-pell' : 'th-robert')).toBeUndefined()
    expect(createProposal(viewer, 'th-johnson-review', 'acc-002')).toMatchObject({ ok: false, status: 404 })
    expect(actAsCco(viewer, { kind: 'alert', id: 'comp-001' })).toMatchObject({ ok: false, status: 404 })
    expect(draftingClientThread(viewer, viewer === PELL ? 'th-pell' : 'th-robert')).toBeUndefined()
    expect(sendToParty(viewer, 'draft-0001')).toMatchObject({ ok: false, status: 404 })
    expect(disposeAlert(viewer, 'comp-001', 'approve', 'X', 'Reviewed.')).toMatchObject({ ok: false, status: 404 })
    expect(reviewCorrespondence(viewer, 'msg-0001', 'reviewed', 'X', 'Reviewed.')).toMatchObject({ ok: false, status: 404 })
  })
  it('a proposal the firm drafted is invisible to both parties', () => {
    const r = createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    if (!r.ok) throw new Error(r.message)
    for (const viewer of EXTERNAL) expect(visibleProposal(viewer, r.detail.id)).toBeUndefined()
    expect(visibleProposal(ADRIAN, r.detail.id)).toBeDefined()
  })
})

describe('the audit: one predicate', () => {
  it('no source outside src/lib/external-party.ts compares a role to client or prospect', () => {
    for (const file of sourceFiles('src')) {
      if (file.endsWith(join('lib', 'external-party.ts'))) continue
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/role\s*[!=]==\s*'(client|prospect)'/)
    }
  })
  it('no source reads a thread\'s clientId: external threads name their party', () => {
    for (const file of sourceFiles('src')) expect(readFileSync(file, 'utf8'), file).not.toMatch(/\b(thread|t|sent\.thread)\.clientId\b|isClientViewer/)
  })
})
```

Create `src/mocks/handlers/__tests__/external-boundary-api.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ensurePellThreads } from '@/mocks/workspace/__tests__/pell-threads'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

const FIRM_ROUTES: readonly (readonly [string, string, unknown?])[] = [
  ['GET', '/meetings'], ['GET', '/meetings/evt-010'], ['GET', '/households/hh-001'], ['GET', '/clients/cli-001'],
  ['GET', '/supervision'], ['GET', '/archive'], ['GET', '/archive?kind=bogus'], ['GET', '/proposals'], ['GET', '/proposals?threadId=th-johnson-review'],
  ['GET', '/threads/th-johnson-review'], ['GET', '/threads/th-pell-work'], ['GET', '/threads/th-pell/drafts'], ['GET', '/threads/th-robert/drafts'],
  ['POST', '/proposals', { threadId: 'th-johnson-review', accountId: 'acc-002' }],
  ['POST', '/acts', { kind: 'approve_proposal', proposalId: 'prop-0001', version: 1, fingerprint: 'X' }],
  ['POST', '/acts', { kind: 'send_to_party', draftId: 'draft-0001' }],
  ['POST', '/acts', { kind: 'nonsense' }],
  ['POST', '/presenter/act-as-cco', { item: { kind: 'alert', id: 'comp-001' } }],
  ['POST', '/meetings/evt-010/prep'],
  ['POST', '/threads/th-robert/drafts/letter', { proposalId: 'prop-0001' }],
  ['POST', '/threads/th-robert/drafts/recap', { eventId: 'evt-010' }],
]

beforeEach(ensurePellThreads)

describe('the boundary over HTTP', () => {
  it.each(['prsp-011', 'cli-001'])('%s gets 404 from every firm route, before any body is read', async (viewer) => {
    for (const [method, path, body] of FIRM_ROUTES) expect((await call(method, path, viewer, body)).status, `${method} ${path}`).toBe(404)
  })

  it("each party reads their own thread and not the other's", async () => {
    expect((await call('GET', '/threads/th-pell', 'prsp-011')).status).toBe(200)
    expect((await call('GET', '/threads/th-robert', 'prsp-011')).status).toBe(404)
    expect((await call('GET', '/threads/th-pell', 'cli-001')).status).toBe(404)
    expect((await call('GET', '/threads', 'prsp-011')).body.map((t: { id: string }) => t.id)).toEqual(['th-pell'])
  })

  it('she writes in her own thread; the firm drafts there; Robert cannot reach it', async () => {
    expect((await call('POST', '/threads/th-pell/messages', 'prsp-011', { body: 'Looking forward to it.' })).status).toBe(201)
    expect((await call('POST', '/threads/th-pell/messages', 'cli-001', { body: 'Hello' })).status).toBe(404)
    expect(await call('POST', '/threads/th-pell/messages', 'user-001', { body: 'Hello' })).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
  })

  it('her directory names only the people in her thread, and no agents', async () => {
    const { body } = await call('GET', '/people', 'prsp-011')
    expect(body.people.map((p: { id: string }) => p.id).sort()).toEqual(['prsp-011', 'user-001', 'user-002'])
    expect(body.agents).toEqual([])
    expect(body.permissions).toEqual({ 'prsp-011': [] })
  })

  it('her acts list is empty and readable', async () => {
    expect(await call('GET', '/acts?threadId=th-pell', 'prsp-011')).toEqual({ status: 200, body: [] })
  })
})
```

Add to `src/kit/__tests__/VisibilityBand.test.tsx`:

```ts
import { visibilityWords } from '@/kit/visibility/visibility'

describe('the band names the party', () => {
  it('reads the client words by default and the prospect words for prospect work', () => {
    expect(visibilityWords('client')).toBe('CLIENT CAN SEE')
    expect(visibilityWords('client', 'prospect')).toBe('PROSPECT CAN SEE')
    expect(visibilityWords('internal', 'prospect')).toBe("Firm only · prospect can't see")
    expect(visibilityWords('private', 'prospect')).toBe('Only you')
  })
  it('renders the prospect band with its accessible name', () => {
    render(<VisibilityBand visibility="client" party="prospect" audience="Dr. Amanda Pell" />)
    expect(screen.getByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toHaveTextContent('Dr. Amanda Pell')
  })
})
```

Add to `src/lib/__tests__/words.test.ts`:

```ts
import { addressNameOf } from '@/lib/words'

describe('addressNameOf', () => {
  it.each([['Dr. Amanda Pell', 'Dr. Pell'], ['Robert Johnson', 'Robert'], ['Mrs. Karen O\'Brien', 'Mrs. O\'Brien'], ['Cher', 'Cher']])(
    '%s → %s', (name, expected) => expect(addressNameOf(name)).toBe(expected))
})
```

In `src/mocks/data/__tests__/people.test.ts`: the first test becomes `'has the six roles and no real names'` with `['advisor', 'analyst', 'client', 'compliance', 'csa', 'prospect']`; add rows `['prsp-011', 'post_firm', false], ['prsp-011', 'send_to_party', false]`; rename every `'send_to_client'` row to `'send_to_party'` (Step 5's sweep does this).

In `src/workspace/__tests__/shell.test.tsx:67-68,86`: the View as options gain `'Dr. Amanda Pell · Prospect'` after `'Robert Johnson · Client'`, and the count becomes 6.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/lib/__tests__/external-party.test.ts src/mocks/workspace/__tests__/external-boundary.test.ts src/mocks/handlers/__tests__/external-boundary-api.test.ts src/kit/__tests__/VisibilityBand.test.tsx --testTimeout 30000`
Expected: FAIL — the modules do not exist; `partyId` is not a `Thread` field.

- [ ] **Step 3: The predicate, the types and the directory**

Create `src/lib/external-party.ts`:

```ts
import type { Role } from '@/types/workspace'

/** A party outside the firm: a client, or a prospect who is not yet one. */
export type PartyKind = 'client' | 'prospect'

const EXTERNAL_ROLES: ReadonlySet<Role> = new Set<Role>(['client', 'prospect'])

/**
 * The one predicate behind every firm gate: whether a role is outside the firm. An outsider sees only
 * their own thread and is told every firm surface does not exist. The engine and the UI both read it.
 */
export const isExternalRole = (role: Role): role is PartyKind => EXTERNAL_ROLES.has(role)
```

In `src/types/workspace.ts` apply the four changed lines from Interfaces (`Role`, `Subject`, `Thread` with `partyId`, `BindingActKind` with `send_to_party`) and change the `messageId` comment to `/** The message a send_to_party act delivered. */`.

In `src/mocks/data/people.ts`: append `{ id: 'prsp-011', name: 'Dr. Amanda Pell', role: 'prospect' }` to `PEOPLE`; in `PERMISSIONS` replace `'send_to_client'` with `'send_to_party'` in the advisor row and add `prospect: [],`.

In `src/workspace/people/role-label.ts` add `prospect: 'Prospect',` to `ROLE_LABEL`.

In `src/mocks/data/workspace-seed.ts` `th-robert`: `clientId: 'cli-001'` → `partyId: 'cli-001'`.

Replace `src/mocks/workspace/visibility.ts` with:

```ts
import type { Thread } from '@/types/workspace'
import { can, personById } from '@/mocks/data/people'
import { store } from '@/mocks/data/workspace-store'
import { isExternalRole } from '@/lib/external-party'

/** A client or a prospect: a party outside the firm, who sees only their own thread. */
export function isExternalViewer(viewerId: string): boolean {
  const viewer = personById(viewerId)
  return viewer !== undefined && isExternalRole(viewer.role)
}

/** A known person inside the firm. Firm surfaces admit only these; anyone else is told they do not exist. */
export function isFirmViewer(viewerId: string): boolean {
  const viewer = personById(viewerId)
  return viewer !== undefined && !isExternalRole(viewer.role)
}

export function canSeeThread(viewerId: string, thread: Thread): boolean {
  const viewer = personById(viewerId)
  if (!viewer) return false
  if (isExternalRole(viewer.role)) return thread.visibility === 'client' && thread.partyId === viewer.id
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

Create `src/mocks/workspace/party.ts`:

```ts
import type { Thread } from '@/types/workspace'
import type { PartyKind } from '@/lib/external-party'
import { clients } from '@/mocks/data/clients'
import { prospects } from '@/mocks/data/prospects'

export type Party = { id: string; kind: PartyKind; name: string }

/** A client from the CRM's clients, a prospect from its prospects. */
export function partyOf(partyId: string): Party | undefined {
  const client = clients.find((c) => c.id === partyId)
  if (client) return { id: client.id, kind: 'client', name: client.fullName }
  const prospect = prospects.find((p) => p.id === partyId)
  return prospect ? { id: prospect.id, kind: 'prospect', name: prospect.name } : undefined
}

/** The party an external-visible thread is with. Such a thread always names one. */
export function partyOfThread(thread: Thread): Party {
  const party = thread.partyId === undefined ? undefined : partyOf(thread.partyId)
  if (!party) throw new Error(`Thread ${thread.id} names no known party`)
  return party
}
```

- [ ] **Step 4: Route every gate through the predicate**

Apply, file by file (line numbers are today's):

- `compliance-acts.ts`: delete the local `isClient` (line 158); line 162 → `if (!alert || !isFirmViewer(viewerId)) return refuse(404, 'NO_ALERT', 'Alert not found.')`; line 187 → `if (!sent || isExternalViewer(viewerId) || !canSeeThread(viewerId, sent.thread)) return refuse(404, 'NO_MESSAGE', 'Message not found.')`; lines 195–196 → `const party = partyOfThread(sent.thread)` and the summary uses `party.name` in place of `client.fullName` (`Reviewed the message sent to ${party.name}` / `Flagged the message sent to ${party.name} for follow-up`); the message of the 403 becomes `'Only compliance can review correspondence with a client or prospect.'`. Import `isExternalViewer, isFirmViewer` from `./visibility` and `partyOfThread` from `./party`; drop the now-unused `clients` import if nothing else reads it.
- `household-views.ts`: delete the local `isFirmViewer` (lines 29–32) and import it from `./visibility`.
- `proposal-acts.ts:15` → `if (!proposal || !isFirmViewer(viewerId)) return undefined`.
- `supervision.ts:78-79` → `if (!isFirmViewer(viewerId)) return undefined` (drop the `viewer` local); line 48 → `const party = partyOfThread(sent.thread)`, and the item uses `clientId: party.id, clientName: party.name, title: \`Message to ${party.name}\`` (Task 13 renames the fields).
- `presenter.ts:24-25` → `if (!isFirmViewer(presenterId)) return refuse(404, 'NOT_FOUND', 'Not found.')`.
- `proposals.ts:23` → `if (!isFirmViewer(viewerId)) return refuse(404, 'NOT_FOUND', 'Not found.')`; lines 129–130 → `if (!isFirmViewer(viewerId)) return undefined`.
- `meetings.ts:59-60` and `76-77` → `if (!isFirmViewer(viewerId)) return undefined`; line 208 → `? isFirmViewer(owner.personId)`.
- `archive.ts:56-57` → `if (!isFirmViewer(viewerId)) return undefined`; line 31 `return thread?.clientId` → `return thread?.partyId`; line 44 `sent?.thread.clientId` → `sent?.thread.partyId`; `clientName` (line 15) becomes `(id: string | undefined) => (id === undefined ? undefined : partyOf(id)?.name)`.
- `letters.ts:16` → `if (!thread || !canSeeThread(viewerId, thread) || !isFirmViewer(viewerId) || !can(viewerId, 'draft_for_client')) return undefined`; line 26 `thread.clientId` → `thread.partyId`.
- `recap.ts:22,26`: `thread.clientId` → `thread.partyId`.
- `draft-staleness.ts:25`: `?.clientId` → `?.partyId`.
- `handlers/workspace-http.ts:24` → `if (!isFirmViewer(viewerId)) return { ok: false, response: notFound() }` (import from `../workspace/visibility`; drop `personById`).
- `handlers/workspace.ts`:

```ts
/** An outsider's directory: themselves and the people in their own thread. No agents, no firm permissions. */
function externalDirectory(partyId: string): Directory {
  const ids = new Set([partyId])
  for (const thread of visibleThreads(partyId)) thread.memberIds.forEach((id) => ids.add(id))
  return { people: PEOPLE.filter((p) => ids.has(p.id)), agents: [], permissions: { [partyId]: permissionsOf(partyId) } }
}

/** The record kinds an outsider may read in their own thread: what reached them. */
const PARTY_VISIBLE_ACTS: ReadonlySet<BindingActKind> = new Set<BindingActKind>(['send_to_party'])
```

  `GET /people` → `isExternalViewer(viewer) ? externalDirectory(viewer) : fullDirectory()`; `POST /threads/:id/messages` lines 62–66 →

```ts
    const external = isExternalViewer(viewer)
    const allowed = thread.visibility === 'client'
      ? external && thread.partyId === viewer
      : !external && (thread.memberIds.includes(viewer) || thread.ownerId === viewer)
    if (!allowed) return HttpResponse.json({ code: 'NOT_PERMITTED', message: thread.visibility === 'client' ? 'Write a draft; sending is a recorded act.' : 'Only members can post here.' }, { status: 403 })
```

  `GET /threads/:id/drafts` line 79 → `if (!thread || !canSeeThread(viewer, thread) || isExternalViewer(viewer)) return notFound()`; `GET /acts` lines 104–107 → `// An outsider sees the record of what reached them, …` and `isExternalViewer(viewer) ? acts.filter((a) => PARTY_VISIBLE_ACTS.has(a.kind)).map(withoutProvenance) : acts`; `POST /acts` line 114 → `if (isExternalViewer(viewer)) return notFound()`; the `case 'send_to_client'` becomes `case 'send_to_party'` calling `sendToParty`. Import `isExternalViewer` from `../workspace/visibility`, `BindingActKind` from `@/types/workspace`; drop `personById` if unused.

Replace `sendToClient` in `src/mocks/workspace/acts.ts` with:

```ts
export function sendToParty(viewerId: string, draftId: string): { ok: true; act: BindingAct } | Failure {
  const s = store()
  const noDraft: Failure = { ok: false, status: 404, code: 'NO_DRAFT', message: 'Draft not found.' }
  if (!isFirmViewer(viewerId)) return noDraft
  const draft = s.drafts.find((d) => d.id === draftId)
  if (!draft) {
    const sent = s.acts.find((a) => a.kind === 'send_to_party' && a.subject?.type === 'draft' && a.subject.id === draftId)
    const sentThread = sent && s.threads.find((t) => t.id === sent.threadId)
    return sent && sentThread && canSeeThread(viewerId, sentThread)
      ? { ok: false, status: 409, code: 'ALREADY_SENT', message: `This draft was already sent (${sent.id}).` }
      : noDraft
  }
  const thread = s.threads.find((t) => t.id === draft.clientThreadId)
  if (!thread || !canSeeThread(viewerId, thread)) return noDraft
  if (!can(viewerId, 'send_to_party')) return { ok: false, status: 403, code: 'NOT_PERMITTED', message: 'Only the advisor of record can send to a client or prospect.' }
  if (isStale(draft)) return { ok: false, status: 409, code: 'STALE_DRAFT', message: staleMessage(draft) }
  const party = partyOfThread(thread)

  const at = nextAt()
  const text: Message = { kind: 'text', id: nextId('msg'), threadId: thread.id, authorId: viewerId, at, body: draft.body }
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_party', actorId: viewerId, at, threadId: thread.id,
    subject: { type: 'draft', id: draftId }, fingerprint: fingerprint(draft.body), messageId: text.id,
    summary: `Message sent to the ${party.kind}`,
    // Books and records: an agent's letter records what it came from (an approved version or a filed record) and every person who edited it.
    ...(draft.agentId ? {
      ...(draft.basis ? { basis: draft.basis } : {}),
      ...(draft.recordBasis ? { recordBasis: draft.recordBasis } : {}),
      editedBy: draft.editorIds ?? [],
    } : {}),
  }
  const marker: Message = { kind: 'act', id: nextId('msg'), threadId: thread.id, at: nextAt(), actId: act.id }
  s.acts.push(act)
  s.messages.push(text, marker)
  s.drafts = s.drafts.filter((d) => d.id !== draftId)
  return { ok: true, act }
}
```

(imports: `isFirmViewer, canSeeThread` from `./visibility`, `partyOfThread` from `./party`; drop `personById`).

- [ ] **Step 5: The renaming sweep**

Run, from the repository root:

```bash
grep -rlE "send_to_client|sendToClient|SendToClient|isClientViewer|viewerIsClient" src e2e-visual \
  | xargs sed -i '' -e 's/send_to_client/send_to_party/g' -e 's/sendToClient/sendToParty/g' -e 's/SendToClient/SendToParty/g' \
                    -e 's/isClientViewer/isExternalViewerIn/g' -e 's/viewerIsClient/viewerIsExternal/g'
```

Then in `src/workspace/thread/act-kind-label.ts` set `send_to_party: 'Send to client or prospect',` and rename `actWording`'s third parameter `forClient` → `forParty`; update the tests that pinned the old label (`thread.test.tsx:182`, `context.test.tsx:86`: `'Send to client or prospect · binding'`). In tests and fixtures that build threads, replace `clientId: 'cli-001'` on a `Thread` with `partyId: 'cli-001'` (`grep -rn "visibility: 'client', clientId" src` finds them).

Rewrite `src/workspace/people/directory-people.ts`'s predicate:

```ts
import { isExternalRole } from '@/lib/external-party'

/** Whether the viewer is outside the firm (a client or a prospect), read from their role in the directory the engine served them. */
export const isExternalViewerIn = (directory: Directory, viewerId: string) =>
  directory.people.some((p) => p.id === viewerId && isExternalRole(p.role))
```

- [ ] **Step 6: The band names the party; drafts address the party**

Replace `src/kit/visibility/visibility.ts` with:

```ts
export type Visibility = 'private' | 'internal' | 'client'
/** Whose work the band is about. The kit's own word for it; the workspace decides which. */
export type Party = 'client' | 'prospect'

/** The band's words: who can read what sits under it. */
export function visibilityWords(visibility: Visibility, party: Party = 'client'): string {
  switch (visibility) {
    case 'private': return 'Only you'
    case 'internal': return `Firm only · ${party} can't see`
    case 'client': return `${party.toUpperCase()} CAN SEE`
  }
}

export const VISIBILITY_WORDS: Readonly<Record<Visibility, string>> = {
  private: visibilityWords('private'),
  internal: visibilityWords('internal'),
  client: visibilityWords('client'),
}
```

In `src/kit/visibility/VisibilityBand.tsx`: `type BandProps = { visibility: Visibility; scale?: 'thread' | 'message'; audience?: string; party?: Party }`, the function takes `party = 'client'` and `const words = visibilityWords(visibility, party)` (import `visibilityWords, type Party`).

Create `src/workspace/people/thread-party.ts`:

```ts
import type { PartyKind } from '@/lib/external-party'
import type { Thread } from '@/types/workspace'

/** Whose work a thread is: a prospect's (her thread and its internal sibling) or, for every other thread, a client's. The band's words follow it. */
export const threadParty = (thread: Thread): PartyKind => (thread.subject?.type === 'prospect' ? 'prospect' : 'client')
```

Add to `src/lib/words.ts`:

```ts
const HONORIFICS: ReadonlySet<string> = new Set(['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Mx.'])

/** How a letter or a button addresses someone: "Dr. Amanda Pell" → "Dr. Pell"; "Robert Johnson" → "Robert". */
export function addressNameOf(fullName: string): string {
  const words = fullName.split(' ')
  const first = words[0] ?? fullName
  return HONORIFICS.has(first) && words.length > 1 ? `${first} ${words[words.length - 1]}` : first
}
```

- `ThreadPage.tsx` `Thread` (lines 32–38): `const audience = thread.visibility === 'client' ? directory.people.find((p) => p.id === thread.partyId)?.name : undefined`, the throw names `partyId` ("The party of thread …"), and the band is `<VisibilityBand visibility={thread.visibility} scale="thread" audience={audience} party={threadParty(thread)} />`.
- `ThreadList.tsx`: the group title `'Client'` becomes `'Clients and prospects'`; the band is `<VisibilityBand visibility={t.visibility} scale="message" party={threadParty(t)} />`.
- `composer-mode.ts`: `| { kind: 'draft'; addressName: string }`; lines 16–20 read `thread.partyId` and return `{ kind: 'draft', addressName: addressNameOf(party.name) }` (the throw says "The party of thread …"); `Composer.tsx` passes `addressName={mode.addressName}` and its placeholder reads `` `Write a draft for ${addressName} (not sent until you send it)` ``.
- `DraftsPanel.tsx` lines 27–28, 48–56: `if (!thread.partyId) throw new Error(\`Thread "${thread.id}" has no party to send to\`)`, `const party = personIn(directory, thread.partyId)`, `const name = addressNameOf(party.name)`; the section title is `` `Drafts for ${name}` ``, the send label `` `Send to ${name}` ``; `LetterControl` and `RecapControl` render only when `threadParty(thread) === 'client'` (a prospect has no approved account proposal or filed meeting). `RecapControl.tsx:22` and `LetterControl.tsx:20` read `thread.partyId`.

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run src/lib src/kit src/mocks src/workspace --testTimeout 30000`
Expected: PASS. A failing legacy test that built a thread with `clientId`, pinned the old send label, or counted five roles / five "View as" options is updated as Step 1 and Step 5 describe — never the engine back.

- [ ] **Step 8: Prove the audit is complete**

Run: `grep -rnE "role (===|!==) '(client|prospect)'|\.clientId === viewer|isClientViewer" src | grep -v __tests__ | grep -v "src/lib/external-party.ts"`
Expected: no output.

- [ ] **Step 9: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src e2e-visual
git commit -m "feat(workspace): one external-party boundary — prospects and clients through isExternalRole, partyId, send_to_party, band words per party

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 3: Prospect types, the store, her two threads, the new message kinds and act kinds, the NBA link

The shared contract every later task reads: the prospect record and proposal types, the store that holds them (reset with the workspace), her scripted content, the two seeded threads (her thread "Dr. Amanda Pell" and the internal "Pell · prospect work"), her seeded first message, the Brief's next-best-action line, the seven new message kinds with their views, and the two new binding acts (`deliver_disclosure`, `accept_proposal`) with their wording for the firm and for her.

**Files:**
- Create: `src/types/workspace-prospect.ts`, `src/mocks/data/prospect-seed.ts`, `src/mocks/data/prospect-script.ts`, `src/mocks/workspace/prospects.ts`, `src/workspace/prospect/prospect-words.ts`, `src/workspace/thread/NextActionView.tsx`, `src/workspace/thread/DisclosureLine.tsx`, `src/workspace/thread/PartyStepLine.tsx`, `src/workspace/thread/ProspectNoteView.tsx`, `src/workspace/thread/ProspectProposalVersionLine.tsx`, `src/workspace/thread/OnboardingOpenedView.tsx`, `src/mocks/workspace/__tests__/prospect-store.test.ts`, `src/workspace/__tests__/prospect-messages.test.tsx`
- Modify: `src/types/workspace.ts` (subjects, message kinds, act kinds, `ViaPresenter`, `BindingAct` fields), `src/types/workspace-supervision.ts` (`ARCHIVE_KINDS`), `src/mocks/data/people.ts` (advisor `deliver_disclosure`), `src/mocks/data/workspace-store.ts`, `src/mocks/data/workspace-seed.ts`, `src/mocks/data/nbas.ts` (`nba-015` route), `src/mocks/handlers/workspace.ts` (`PARTY_VISIBLE_ACTS`, `withoutProvenance`), `src/workspace/thread/MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx`, `src/workspace/thread/act-kind-label.ts`, `src/workspace/thread/act-provenance.ts`, `src/workspace/thread/ActRecordSlip.tsx`, `src/mocks/data/__tests__/workspace-seed.test.ts`

**Interfaces:**
- Consumes: `PartyKind` (Task 2), `RiskAnswer` (`src/types/onboarding.ts`), `AssetClass`.
- Produces: everything in `src/types/workspace-prospect.ts` (below, exactly), and:

```ts
// src/types/workspace.ts (added)
export type PresenterPath = 'shortcut' | 'view_as' | 'scripted'
export type ViaPresenter = { presenterId: string; path?: PresenterPath }        // no path: the shortcut
// Subject.type gains 'prospect_proposal'
// BindingActKind gains 'deliver_disclosure' | 'accept_proposal'
// BindingAct gains: delivers?: DisclosureDocument[]; bestInterest?: BestInterestRecord
// Message gains: next_action, disclosure_delivered, party_step, prospect_note, prospect_proposal, prospect_proposal_version, onboarding_opened (shapes below)

// src/mocks/data/prospect-seed.ts
export const PELL_ID = 'prsp-011'
export const PELL_THREAD_ID = 'th-pell'
export const PELL_WORK_THREAD_ID = 'th-pell-work'
export const SEED_PROSPECTS: readonly ProspectRecord[]

// src/mocks/data/prospect-script.ts
export const PELL_ANSWERS: readonly RiskAnswer[]
export const PELL_STATEMENTS: readonly Statement[]
export const PELL_INTRO: string
export const PELL_REPLY: string
export const PELL_ACCEPTANCE: string
export const REPLY_AT = '2026-02-26T14:10:00.000Z'
export const ACCEPTANCE_AT = '2026-03-02T15:00:00.000Z'

// src/mocks/workspace/prospects.ts
export const PROSPECT_STAGES: readonly ProspectStage[]
export function prospectOf(id: string): ProspectRecord | undefined
export function requireProspect(id: string): ProspectRecord                     // throws
export function visibleProspect(viewerId: string, id: string): ProspectRecord | undefined   // firm viewer who can see her internal thread
export function advanceStage(record: ProspectRecord, stage: ProspectStage, at: string): void  // forward only, recorded in stageHistory
export function prospectRevision(id: string): number                           // coffee + steps on file
export function prospectSummaries(viewerId: string): ProspectSummary[] | undefined

// src/workspace/prospect/prospect-words.ts
export const STAGE_WORDS: Readonly<Record<ProspectStage, string>>
export const ONBOARDING_STATUS_WORDS: Readonly<Record<OnboardingItemStatus, string>>
export const PATH_WORDS: Readonly<Record<PresenterPath, (presenterName: string) => string>>
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/prospect-store.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { nbas } from '@/mocks/data/nbas'
import { SEED_LAST_SEQUENCE, SEED_MESSAGES } from '@/mocks/data/workspace-seed'
import { PELL_ANSWERS, PELL_STATEMENTS } from '@/mocks/data/prospect-script'
import { riskQuestions } from '@/mocks/data/onboarding'
import { advanceStage, prospectOf, prospectRevision, prospectSummaries, requireProspect, visibleProspect } from '../prospects'

describe('the prospect record', () => {
  it('seeds Dr. Pell at first contact, with her two threads and nothing on file', () => {
    expect(prospectOf('prsp-011')).toEqual({
      id: 'prsp-011', name: 'Dr. Amanda Pell', salutation: 'Dr. Pell', referredBy: 'cli-008',
      stage: 'contact', stageHistory: [{ stage: 'contact', at: '2026-02-20T14:30:00Z' }],
      threadId: 'th-pell', internalThreadId: 'th-pell-work', eventId: 'evt-004',
      statements: [], disclosures: [], steps: [], tasks: [],
    })
    expect(store().prospectProposals).toEqual([])
  })

  it('seeds her thread (she can see it) and its internal sibling (firm only)', () => {
    expect(store().threads.find((t) => t.id === 'th-pell')).toMatchObject({ title: 'Dr. Amanda Pell', visibility: 'client', partyId: 'prsp-011', subject: { type: 'prospect', id: 'prsp-011' } })
    expect(store().threads.find((t) => t.id === 'th-pell-work')).toMatchObject({ title: 'Pell · prospect work', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'] })
  })

  it('seeds her first message in her thread and the next-best action in the Brief, in seed order', () => {
    expect(SEED_MESSAGES.find((m) => m.id === 'msg-s07')).toMatchObject({ kind: 'text', threadId: 'th-pell', authorId: 'prsp-011' })
    expect(SEED_MESSAGES.find((m) => m.id === 'msg-s08')).toMatchObject({ kind: 'next_action', threadId: 'th-brief', nbaId: 'nba-015', title: 'Referral: Dr. Amanda Pell', targetThreadId: 'th-pell' })
    expect(SEED_LAST_SEQUENCE).toBe(8)
  })

  it('nba-015 opens her thread', () => {
    expect(nbas.find((n) => n.id === 'nba-015')?.actionRoute).toEqual({ path: '/t/th-pell' })
  })

  it('a firm viewer who can see her internal thread may read her; she, Robert and nobody may not', () => {
    for (const viewer of ['user-001', 'user-002', 'user-003', 'cco-001']) expect(visibleProspect(viewer, 'prsp-011')?.id, viewer).toBe('prsp-011')
    for (const viewer of ['prsp-011', 'cli-001', 'nobody']) expect(visibleProspect(viewer, 'prsp-011'), viewer).toBeUndefined()
    expect(prospectSummaries('user-001')).toEqual([{ id: 'prsp-011', name: 'Dr. Amanda Pell', stage: 'contact', threadId: 'th-pell', internalThreadId: 'th-pell-work' }])
    expect(prospectSummaries('prsp-011')).toBeUndefined()
  })

  it('moves her stage forward only, recording when', () => {
    const p = requireProspect('prsp-011')
    advanceStage(p, 'discovery', '2026-02-26T14:10:00.000Z')
    advanceStage(p, 'contact', '2026-02-26T14:11:00.000Z')
    expect(p.stage).toBe('discovery')
    expect(p.stageHistory.map((h) => h.stage)).toEqual(['contact', 'discovery'])
  })

  it('a reset restores the seed', () => {
    requireProspect('prsp-011').steps.push({ kind: 'questionnaire', at: 'x', messageId: 'm', viaPresenter: { presenterId: 'user-001', path: 'scripted' } })
    expect(prospectRevision('prsp-011')).toBe(1)
    resetWorkspaceStore()
    expect(prospectRevision('prsp-011')).toBe(0)
    expect(requireProspect('prsp-011').steps).toEqual([])
  })
})

describe('her script', () => {
  it('answers every question once, inside its options, averaging 66', () => {
    expect(PELL_ANSWERS.map((a) => a.questionId)).toEqual(riskQuestions.map((q) => q.id))
    const scores = PELL_ANSWERS.map((a) => riskQuestions.find((q) => q.id === a.questionId)?.options[a.selectedOption]?.score ?? Number.NaN)
    expect(Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)).toBe(66)
  })

  it('states two month-end statements: a Fidelity taxable account and a TIAA 403(b)', () => {
    expect(PELL_STATEMENTS.map((s) => [s.id, s.custodian, s.accountType, s.asOf])).toEqual([
      ['stmt-pell-1', 'Fidelity', 'taxable_brokerage', '2026-01-31'], ['stmt-pell-2', 'TIAA', '403b', '2026-01-31'],
    ])
    expect(PELL_STATEMENTS[0]?.holdings.map((h) => [h.symbol, h.quantity, h.costBasis, h.acquired])).toEqual([
      ['SPY', 2_800, 1_010_000, '2016-08-15'], ['SYK', 1_390, 61_000, '2008-05-12'],
    ])
  })
})
```

Create `src/workspace/__tests__/prospect-messages.test.tsx`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'
import type { BindingAct, Message } from '@/types/workspace'

const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

const DELIVERY: BindingAct = { id: 'REC-0001', kind: 'deliver_disclosure', actorId: 'user-001', at: '2026-02-25T12:09:00.000Z', threadId: 'th-pell',
  subject: { type: 'prospect', id: 'prsp-011' }, fingerprint: 'AAAAAAAA', summary: 'Delivered Form CRS (client relationship summary) to Dr. Amanda Pell', delivers: ['form_crs'] }
const HERS: Message[] = [
  { kind: 'disclosure_delivered', id: 'msg-t1', threadId: 'th-pell', at: '2026-02-25T12:09:00.000Z', prospectId: 'prsp-011', document: 'form_crs', actId: 'REC-0001' },
  { kind: 'act', id: 'msg-t2', threadId: 'th-pell', at: '2026-02-25T12:10:00.000Z', actId: 'REC-0001' },
  { kind: 'party_step', id: 'msg-t3', threadId: 'th-pell', at: '2026-02-26T14:11:00.000Z', authorId: 'prsp-011', step: 'questionnaire', summary: 'Answered the risk questionnaire.' },
]
const WORK: Message[] = [
  { kind: 'prospect_note', id: 'msg-t4', threadId: 'th-pell-work', at: '2026-02-25T21:30:00.000Z', authorId: 'user-001', prospectId: 'prsp-011', eventId: 'evt-004',
    title: 'Coffee with Dr. Amanda Pell', start: '2026-02-25T20:30:00.000Z', end: '2026-02-25T21:30:00.000Z', body: 'She asked about the old 403(b).' },
  { kind: 'prospect_proposal_version', id: 'msg-t5', threadId: 'th-pell-work', at: '2026-02-26T14:20:00.000Z', proposalId: 'pprop-0001', version: 2,
    author: { kind: 'agent', agentId: 'proposal' }, changeSummary: 'Documented a staged sale of Stryker Corp. over two tax years; nothing sold.' },
  { kind: 'onboarding_opened', id: 'msg-t6', threadId: 'th-pell-work', at: '2026-03-02T15:02:00.000Z', prospectId: 'prsp-011', acceptanceActId: 'REC-0009',
    items: [{ id: 'ofac', label: 'OFAC screen', status: 'open', ownerId: 'user-002', due: '2026-03-03' }, { id: 'acat', label: 'ACAT transfer', status: 'not_started', ownerId: 'user-002' }] },
]

describe('prospect messages', () => {
  afterEach(() => sessionStorage.clear())

  it("the Brief's next-best action opens her thread, whose band names the prospect", async () => {
    const user = userEvent.setup()
    const { router } = renderRoutes(routes, '/t/th-brief')
    const action = await screen.findByRole('article', { name: 'Next best action · Referral: Dr. Amanda Pell' })
    expect(action).toHaveTextContent('Coffee with Adrian Hale today at 15:30 ET')
    await user.click(within(action).getByRole('link', { name: /Open her thread/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/t/th-pell'))
    expect(await screen.findByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toHaveTextContent('Dr. Amanda Pell')
    expect(conversation().getByText('James Thompson suggested I get in touch. Looking forward to coffee this afternoon.')).toBeInTheDocument()
  })

  it('her thread shows a delivered document, its slip in her own terms, and her step', async () => {
    store().acts.push(DELIVERY)
    store().messages.push(...HERS)
    viewAsOnLoad('prsp-011')
    renderRoutes(routes, '/t/th-pell')
    expect(await conversation().findByRole('article', { name: 'Delivered · Form CRS (client relationship summary)' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Document from Adrian Hale'))
    expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Form CRS (client relationship summary) delivered to you')
    expect(conversation().getByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toHaveTextContent('Prospect')
    expect(screen.getByRole('main').textContent).not.toMatch(/binding|Supervisory review/)
  })

  it('the internal thread shows the coffee note, a version line and the onboarding items', async () => {
    store().messages.push(...WORK)
    renderRoutes(routes, '/t/th-pell-work')
    expect(await screen.findByRole('note', { name: "Visibility: Firm only · prospect can't see" })).toBeInTheDocument()
    expect(await conversation().findByRole('article', { name: 'Note · Coffee with Dr. Amanda Pell' })).toHaveTextContent('15:30–16:30 ET')
    expect(conversation().getByRole('article', { name: 'v2 · Proposal Agent' })).toHaveTextContent('nothing sold')
    const onboarding = conversation().getByRole('article', { name: 'Onboarding opened' })
    expect(within(onboarding).getByRole('list', { name: 'Onboarding items' })).toHaveTextContent('OFAC screen')
    expect(onboarding).toHaveTextContent('Sarah Mitchell')
    expect(onboarding).toHaveTextContent('due 2026-03-03')
    expect(onboarding).toHaveTextContent('Not started')
  })
})
```

In `src/mocks/data/__tests__/workspace-seed.test.ts`, any assertion listing seed thread ids gains `'th-pell', 'th-pell-work'` at the end. In `src/workspace/__tests__/shell-keyboard.test.tsx:51-62` the firm's destinations gain `'Thread · Dr. Amanda Pell'` and `'Thread · Pell · prospect work'` after `'Thread · Robert Johnson'`; any thread-list test that counts the firm's threads gains two.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-store.test.ts src/workspace/__tests__/prospect-messages.test.tsx --testTimeout 30000`
Expected: FAIL — `../prospects` and the prospect types do not exist.

- [ ] **Step 3: The prospect types**

Create `src/types/workspace-prospect.ts`:

```ts
import type { AssetClass } from './portfolio'
import type { RiskAnswer } from './onboarding'
import type { BindingAct, VersionAuthor, ViaPresenter } from './workspace'

export type ProspectStage = 'contact' | 'discovery' | 'proposal' | 'accepted' | 'onboarding'

/** One line of a statement she shared: held away, never an engine position. */
export type Holding = { symbol: string; name: string; quantity: number; costBasis: number; acquired: string; assetClass: AssetClass }
export type StatementAccountType = 'taxable_brokerage' | '403b'
export type Statement = { id: string; custodian: string; accountType: StatementAccountType; holdings: Holding[]; cash: number; asOf: string }

export type DisclosureDocument = 'form_crs' | 'adv_2a' | 'adv_2b' | 'privacy_notice'
export const DISCLOSURE_DOCUMENTS: readonly DisclosureDocument[] = ['form_crs', 'adv_2a', 'adv_2b', 'privacy_notice']
export const isDisclosureDocument = (value: unknown): value is DisclosureDocument =>
  typeof value === 'string' && (DISCLOSURE_DOCUMENTS as readonly string[]).includes(value)
export const DISCLOSURE_TITLES: Readonly<Record<DisclosureDocument, string>> = {
  form_crs: 'Form CRS (client relationship summary)',
  adv_2a: 'Form ADV Part 2A (firm brochure)',
  adv_2b: 'Form ADV Part 2B (brochure supplement)',
  privacy_notice: 'Privacy notice',
}
/** Append-only: each delivery names the act that recorded it. */
export type DisclosureDelivery = { document: DisclosureDocument; actId: string; at: string; deliveredBy: string }

export type Questionnaire = { answers: RiskAnswer[]; receivedAt: string }
export type PartyStepKind = 'questionnaire' | 'statements' | 'acceptance'
/** A step of hers, with the firm-only record of how the one presenter performed it. */
export type PartyStep = { kind: PartyStepKind; at: string; messageId: string; actId?: string; viaPresenter: ViaPresenter }
export type ProspectTask = { id: string; text: string; ownerId: string; due: string; createdAt: string; fromActId: string }

export type OnboardingItemId = 'account_application' | 'cip' | 'ofac' | 'trusted_contact' | 'source_of_funds' | 'advisory_agreement' | 'adv_2b' | 'privacy_notice' | 'acat'
export type OnboardingItemStatus = 'open' | 'awaiting_signature' | 'delivered' | 'not_started'
export type OnboardingItem = { id: OnboardingItemId; label: string; status: OnboardingItemStatus; ownerId: string; due?: string }
export type OnboardingChecklist = { openedAt: string; acceptanceActId: string; items: OnboardingItem[] }

export type StageChange = { stage: ProspectStage; at: string }
export type Coffee = { at: string; messageId: string; authorId: string }
export type SentProposal = { proposalId: string; version: number; actId: string; messageId: string; at: string }
export type Acceptance = { proposalId: string; version: number; actId: string; at: string }

/** The session's record of a prospect: reset with the workspace store. */
export type ProspectRecord = {
  id: string
  name: string
  /** How a letter addresses her: "Dr. Pell". */
  salutation: string
  referredBy?: string
  stage: ProspectStage
  stageHistory: StageChange[]
  threadId: string
  internalThreadId: string
  /** The calendar event of the first meeting (the coffee). */
  eventId: string
  coffee?: Coffee
  questionnaire?: Questionnaire
  /** Shared by her; held-away data, not engine positions. */
  statements: Statement[]
  disclosures: DisclosureDelivery[]
  steps: PartyStep[]
  tasks: ProspectTask[]
  sent?: SentProposal
  accepted?: Acceptance
  onboarding?: OnboardingChecklist
}

/** The one revision the Proposal Agent takes for a prospect: document a staged sale of the concentrated stock. */
export type ProspectConstraint = { kind: 'stage_diversification'; tranches: 2 | 3 }

/** A holding she would transfer: in kind, with what selling it now would realise. */
export type TransferLine = {
  statementId: string; symbol: string; name: string; assetClass: AssetClass; securityKind: 'single_name' | 'fund'
  quantity: number; price: number; marketValue: number; costBasis: number; acquired: string; holdingPeriod: 'short' | 'long'
  unrealised: number; taxIfSoldNow: number; plan: 'in_kind'
}
export type HeldAwayLine = { statementId: string; custodian: string; accountType: '403b'; value: number; rollover: 'asked_about' }
export type Sleeve = { assetClass: AssetClass; target: number; transferred: number }
export type Concentration = { symbol: string; name: string; marketValue: number; weightOfAssets: number; totalAssets: number; unrealised: number; taxIfSoldNow: number }
export type Tranche = { n: number; taxYear: number; shares: number; proceeds: number; gain: number; tax: number }
export type FeeEstimate = { scheduleName: string; base: number; annual: number; blendedRate: number; tiers: { label: string; rate: number }[] }

export type ProspectProposalVersion = {
  n: number
  author: VersionAuthor
  createdAt: string
  constraints: ProspectConstraint[]
  score: number
  profileLabel: string
  modelId: string
  modelName: string
  transfer: TransferLine[]
  cash: number
  transferValue: number
  totalAssets: number
  sleeves: Sleeve[]
  concentration?: Concentration
  tranches: Tranche[]
  heldAway: HeldAwayLine[]
  fees: FeeEstimate
  pricesAsOf: string
  /** What she reads when it is sent: plain language, figures formatted for a client. */
  clientSummary: string
  changeSummary: string
  fingerprint: string
}

export type BestInterestAlternative = { kind: 'lower_risk_model' | 'self_directed'; name: string; annualFee: number; why: string }
/** Firm only: why this recommendation is in her best interest, filed with the approval. */
export type BestInterestRecord = {
  rationale: string
  profileLabel: string
  score: number
  modelId: string
  modelName: string
  alternatives: BestInterestAlternative[]
  costs: { scheduleName: string; annualFee: number; blendedRate: number }
  concentration?: { symbol: string; name: string; weightOfAssets: number; unrealised: number; taxIfSoldNow: number }
  rollover: string
}
/** What the engine would file for the latest version, shown before approval; the advisor adds the rationale. */
export type BestInterestDraft = Omit<BestInterestRecord, 'rationale'>
export type ProspectApproval = { version: number; fingerprint: string; actId: string; approverId: string; at: string }
export type ProspectProposal = { id: string; prospectId: string; title: string; threadId: string; versions: ProspectProposalVersion[]; approval?: ProspectApproval }
export type ProspectProposalDetail = ProspectProposal & { sent?: SentProposal; accepted?: Acceptance; bestInterestDraft: BestInterestDraft }
/** What one of her steps (or a clock jump) returns: her steps as they now stand, and the act it recorded, if any. */
export type StepOutcome = { steps: PartySteps; act?: BindingAct }

export type ProfileResult = { score: number; profileLabel: string; floor: number; ceiling: number; modelId: string; modelName: string }
export type TransferSummary = { lines: TransferLine[]; cash: number; heldAway: HeldAwayLine[]; transferValue: number; totalAssets: number; pricesAsOf: string }
export type NextJump = { to: 'reply' | 'acceptance'; at: string; blockedReason?: string }
/** The prospect as the firm reads her. */
export type ProspectView = ProspectRecord & {
  referrerName?: string
  profile?: ProfileResult
  transfer?: TransferSummary
  proposals: ProspectProposalDetail[]
  nextJump?: NextJump
  formCrsDelivered: boolean
  /** The documents that may be delivered now. */
  deliverable: DisclosureDocument[]
}
export type ProspectSummary = { id: string; name: string; stage: ProspectStage; threadId: string; internalThreadId: string }
export type StepState = 'open' | 'done' | 'unavailable'
/** Her own steps, as she (and the firm) may read them. */
export type PartySteps = { questionnaire: StepState; statements: StepState; acceptance: StepState; sentVersion?: number }
export type ProspectStepName = 'questionnaire' | 'statements' | 'accept'
export const isProspectStepName = (value: unknown): value is ProspectStepName => value === 'questionnaire' || value === 'statements' || value === 'accept'
```

In `src/types/workspace.ts`: import `type { BestInterestRecord, DisclosureDocument, OnboardingItem } from './workspace-prospect'`; add `'prospect_proposal'` to `Subject['type']`; add `PresenterPath` and the new `ViaPresenter` (from Interfaces); `BindingActKind` becomes `'approve_proposal' | 'withdraw_approval' | 'send_to_party' | 'deliver_disclosure' | 'accept_proposal' | 'file_meeting_record' | ComplianceActKind`; `BindingAct` gains

```ts
  /** The disclosures this act delivered: the one a deliver_disclosure act names, or ADV 2A delivered with a proposal. */
  delivers?: DisclosureDocument[]
  /** Firm only: filed with the approval of a prospect proposal. */
  bestInterest?: BestInterestRecord
```

and `Message` gains, after `meeting_tasks`:

```ts
  /** The Brief's line for a next-best action, linking to the thread where it is worked. */
  | { kind: 'next_action'; id: string; threadId: string; at: string; nbaId: string; title: string; detail: string; targetThreadId: string; linkLabel: string }
  /** A disclosure delivered to a prospect, in her thread. */
  | { kind: 'disclosure_delivered'; id: string; threadId: string; at: string; prospectId: string; document: DisclosureDocument; actId: string }
  /** A step she took: her questionnaire answered, her statements shared. */
  | { kind: 'party_step'; id: string; threadId: string; at: string; authorId: string; step: 'questionnaire' | 'statements'; summary: string }
  /** A labelled firm note about a prospect meeting that is not a Meeting record (the coffee). */
  | { kind: 'prospect_note'; id: string; threadId: string; at: string; authorId: string; prospectId: string; eventId: string; title: string; start: string; end: string; body: string }
  /** The Proposal Agent drafted a prospect proposal. */
  | { kind: 'prospect_proposal'; id: string; threadId: string; at: string; agentId: AgentId; proposalId: string; title: string }
  | { kind: 'prospect_proposal_version'; id: string; threadId: string; at: string; proposalId: string; version: number; author: VersionAuthor; changeSummary: string }
  /** Her acceptance opened onboarding: the checklist as it was opened. */
  | { kind: 'onboarding_opened'; id: string; threadId: string; at: string; prospectId: string; acceptanceActId: string; items: OnboardingItem[] }
```

In `src/types/workspace-supervision.ts` `ARCHIVE_KINDS` becomes `['approve_proposal', 'withdraw_approval', 'send_to_party', 'sent_message', 'deliver_disclosure', 'accept_proposal', 'file_meeting_record', 'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence']`. In `people.ts` the advisor row gains `'deliver_disclosure'`.

- [ ] **Step 4: The seed, the script and the store**

Create `src/mocks/data/prospect-seed.ts`:

```ts
import type { ProspectRecord } from '@/types/workspace-prospect'

export const PELL_ID = 'prsp-011'
export const PELL_THREAD_ID = 'th-pell'
export const PELL_WORK_THREAD_ID = 'th-pell-work'

/** Dr. Pell at first contact: James Thompson's introduction on Feb 20, coffee this afternoon (evt-004), nothing on file. */
export const SEED_PROSPECTS: readonly ProspectRecord[] = [{
  id: PELL_ID, name: 'Dr. Amanda Pell', salutation: 'Dr. Pell', referredBy: 'cli-008',
  stage: 'contact', stageHistory: [{ stage: 'contact', at: '2026-02-20T14:30:00Z' }],
  threadId: PELL_THREAD_ID, internalThreadId: PELL_WORK_THREAD_ID, eventId: 'evt-004',
  statements: [], disclosures: [], steps: [], tasks: [],
}]
```

Create `src/mocks/data/prospect-script.ts`:

```ts
import type { RiskAnswer } from '@/types/onboarding'
import type { Statement } from '@/types/workspace-prospect'

/**
 * Her answers to the questionnaire Adrian hands her at coffee (option indexes into `riskQuestions`):
 * more than twenty years; hold and wait; long-term growth; over $500,000; moderate experience; 25–50%
 * of net worth; liquidity moderately important; moderate fluctuations — 95, 55, 80, 90, 50, 50, 55, 55,
 * averaging 66 (Moderate Aggressive → Growth).
 */
export const PELL_ANSWERS: readonly RiskAnswer[] = [
  { questionId: 'rq-01', selectedOption: 4 }, { questionId: 'rq-02', selectedOption: 2 }, { questionId: 'rq-03', selectedOption: 3 },
  { questionId: 'rq-04', selectedOption: 4 }, { questionId: 'rq-05', selectedOption: 2 }, { questionId: 'rq-06', selectedOption: 2 },
  { questionId: 'rq-07', selectedOption: 2 }, { questionId: 'rq-08', selectedOption: 2 },
]

/**
 * The two month-end statements she shares. Quantities, basis and acquisition dates are hers; the engine
 * values them at the 25 Feb close. The 403(b)'s basis is what the plan reports and is never taxed here.
 */
export const PELL_STATEMENTS: readonly Statement[] = [
  { id: 'stmt-pell-1', custodian: 'Fidelity', accountType: 'taxable_brokerage', asOf: '2026-01-31', cash: 100_782, holdings: [
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', quantity: 2_800, costBasis: 1_010_000, acquired: '2016-08-15', assetClass: 'us_equity' },
    { symbol: 'SYK', name: 'Stryker Corp.', quantity: 1_390, costBasis: 61_000, acquired: '2008-05-12', assetClass: 'us_equity' },
  ] },
  { id: 'stmt-pell-2', custodian: 'TIAA', accountType: '403b', asOf: '2026-01-31', cash: 8_400, holdings: [
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', quantity: 2_000, costBasis: 410_000, acquired: '2015-03-02', assetClass: 'us_equity' },
    { symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', quantity: 3_600, costBasis: 360_000, acquired: '2015-03-02', assetClass: 'fixed_income' },
  ] },
]

export const PELL_INTRO = 'James Thompson suggested I get in touch. Looking forward to coffee this afternoon.'
export const PELL_REPLY = 'Thank you for the coffee. Here are my answers to the questionnaire and my two statements.'
export const PELL_ACCEPTANCE = "I've read the proposal and I'd like to go ahead."

/** Thu 26 Feb 09:10 ET and Mon 2 Mar 10:00 ET: when her scripted reply and acceptance arrive. */
export const REPLY_AT = '2026-02-26T14:10:00.000Z'
export const ACCEPTANCE_AT = '2026-03-02T15:00:00.000Z'
```

In `src/mocks/data/workspace-seed.ts`: import `PELL_ID, PELL_THREAD_ID, PELL_WORK_THREAD_ID` and `PELL_INTRO`; append to `SEED_THREADS`:

```ts
  { id: PELL_THREAD_ID, title: 'Dr. Amanda Pell', visibility: 'client', partyId: PELL_ID, memberIds: [PELL_ID, 'user-001', 'user-002'],
    agentIds: [], subject: { type: 'prospect', id: PELL_ID } },
  { id: PELL_WORK_THREAD_ID, title: 'Pell · prospect work', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
    agentIds: [], subject: { type: 'prospect', id: PELL_ID } },
```

append to `SEED_MESSAGES`:

```ts
  { kind: 'text', id: 'msg-s07', threadId: PELL_THREAD_ID, authorId: PELL_ID, at: eventTime(7), body: PELL_INTRO },
  // The Brief's line for the referral (nba-015), linking to her thread.
  { kind: 'next_action', id: 'msg-s08', threadId: 'th-brief', at: eventTime(8), nbaId: 'nba-015', title: 'Referral: Dr. Amanda Pell',
    detail: 'James Thompson introduced her on Feb 20. Coffee with Adrian Hale today at 15:30 ET; deliver Form CRS before it.',
    targetThreadId: PELL_THREAD_ID, linkLabel: 'Open her thread' },
```

and set `SEED_LAST_SEQUENCE = 8`. In `src/mocks/data/nbas.ts` `nba-015`: `actionRoute: { path: '/t/th-pell' }`.

In `src/mocks/data/workspace-store.ts`: `Counter` gains `'pproposal' | 'ptask'`; `WorkspaceState` gains

```ts
  /** The session's prospects: stage, disclosures, steps, statements, tasks, onboarding. */
  prospects: ProspectRecord[]
  prospectProposals: ProspectProposal[]
```

and `seed()` adds

```ts
    prospects: SEED_PROSPECTS.map((p) => ({ ...p, stageHistory: [...p.stageHistory], statements: [], disclosures: [], steps: [], tasks: [] })),
    prospectProposals: [],
```

with `pproposal: 0, ptask: 0` in `counters` (imports: `SEED_PROSPECTS` from `./prospect-seed`, the two types from `@/types/workspace-prospect`).

Create `src/mocks/workspace/prospects.ts`:

```ts
import type { ProspectRecord, ProspectStage, ProspectSummary } from '@/types/workspace-prospect'
import { store } from '@/mocks/data/workspace-store'
import { canSeeThread, isFirmViewer } from './visibility'

export const PROSPECT_STAGES: readonly ProspectStage[] = ['contact', 'discovery', 'proposal', 'accepted', 'onboarding']

export const prospectOf = (id: string): ProspectRecord | undefined => store().prospects.find((p) => p.id === id)

export function requireProspect(id: string): ProspectRecord {
  const record = prospectOf(id)
  if (!record) throw new Error(`No prospect ${id}`)
  return record
}

/** A prospect a firm viewer may read: one whose internal thread they can see. Anyone else is told she does not exist. */
export function visibleProspect(viewerId: string, id: string): ProspectRecord | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const record = prospectOf(id)
  const thread = record && store().threads.find((t) => t.id === record.internalThreadId)
  return record && thread && canSeeThread(viewerId, thread) ? record : undefined
}

/** Moves her stage forward, recording when; a stage she has passed is never re-entered. */
export function advanceStage(record: ProspectRecord, stage: ProspectStage, at: string): void {
  if (PROSPECT_STAGES.indexOf(stage) <= PROSPECT_STAGES.indexOf(record.stage)) return
  record.stage = stage
  record.stageHistory.push({ stage, at })
}

/** What is on file about her: an agent run on her is a new run once this moves. */
export function prospectRevision(id: string): number {
  const record = prospectOf(id)
  return record ? record.steps.length + (record.coffee ? 1 : 0) : 0
}

export function prospectSummaries(viewerId: string): ProspectSummary[] | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  return store().prospects.filter((p) => visibleProspect(viewerId, p.id) !== undefined)
    .map((p) => ({ id: p.id, name: p.name, stage: p.stage, threadId: p.threadId, internalThreadId: p.internalThreadId }))
}
```

In `src/mocks/handlers/workspace.ts`: `PARTY_VISIBLE_ACTS` becomes `new Set<BindingActKind>(['send_to_party', 'deliver_disclosure', 'accept_proposal'])` and `withoutProvenance` also drops `bestInterest: _bestInterest`.

- [ ] **Step 5: Words, act wording and the message views**

Create `src/workspace/prospect/prospect-words.ts`:

```ts
import type { PresenterPath } from '@/types/workspace'
import type { OnboardingItemStatus, ProspectStage } from '@/types/workspace-prospect'

export const STAGE_WORDS: Readonly<Record<ProspectStage, string>> = {
  contact: 'Contact', discovery: 'Discovery', proposal: 'Proposal sent', accepted: 'Accepted', onboarding: 'Onboarding',
}

export const ONBOARDING_STATUS_WORDS: Readonly<Record<OnboardingItemStatus, string>> = {
  open: 'Open', awaiting_signature: 'Awaiting her signature', delivered: 'Delivered', not_started: 'Not started',
}

/** The firm-only line that says how the one presenter performed a step recorded as someone else. */
export const PATH_WORDS: Readonly<Record<PresenterPath, (presenterName: string) => string>> = {
  shortcut: (name) => `Demo · recorded through the presenter shortcut by ${name}`,
  view_as: (name) => `Demo · performed by ${name} viewing as the prospect`,
  scripted: (name) => `Demo · a scripted step, run by ${name} on a clock jump`,
}
```

Replace `src/workspace/thread/act-provenance.ts` with:

```ts
import type { BindingAct, Directory } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'
import { PATH_WORDS } from '@/workspace/prospect/prospect-words'

/** The firm's record of how an act was made: its rationale, its best-interest record, and the presenter's path when one was used. */
export function actProvenance(act: BindingAct, directory: Directory): string[] {
  const presenter = act.viaPresenter && personIn(directory, act.viaPresenter.presenterId).name
  return [
    ...(act.rationale ? [`Rationale · ${act.rationale}`] : []),
    ...(act.bestInterest ? [`Best-interest record filed · ${act.bestInterest.rationale}`] : []),
    ...(act.viaPresenter && presenter ? [PATH_WORDS[act.viaPresenter.path ?? 'shortcut'](presenter)] : []),
  ]
}
```

In `src/workspace/thread/act-kind-label.ts` add `deliver_disclosure: 'Deliver disclosure',` and `accept_proposal: 'Accept proposal',` to `ACT_KIND_LABEL`, and replace `actWording` with:

```ts
/**
 * How a recorded act reads to its viewer. The firm sees the binding act and its supervisory archive; an
 * outside party sees what reached them, kept as a record, in their own terms.
 */
export function actWording(act: BindingAct, actor: Person, forParty: boolean): ActWording {
  if (!forParty) return { kind: `${ACT_KIND_LABEL[act.kind]} · binding`, title: act.summary, archive: 'Supervisory review', trailLabel: ACT_KIND_LABEL[act.kind] }
  const documents = (act.delivers ?? []).map((d) => DISCLOSURE_TITLES[d]).join(', ')
  switch (act.kind) {
    case 'deliver_disclosure':
      return { kind: `Document from ${actor.name}`, title: `${documents} delivered to you`, archive: 'Retained as a record', trailLabel: `Document from ${actor.name}` }
    case 'accept_proposal':
      return { kind: `Acceptance by ${actor.name}`, title: 'You accepted the proposal', archive: 'Retained as a record', trailLabel: `Acceptance by ${actor.name}` }
    default:
      return { kind: `Message from ${actor.name}`, title: documents ? `Sent to you, with ${documents}` : 'Sent to you', archive: 'Retained as a record', trailLabel: `Message from ${actor.name}` }
  }
}
```

(import `DISCLOSURE_TITLES` from `@/types/workspace-prospect`).

Create `src/workspace/thread/NextActionView.tsx`:

```tsx
import { Link } from 'react-router-dom'
import type { Message } from '@/types/workspace'

type NextAction = Extract<Message, { kind: 'next_action' }>

/** The Brief's line for a next-best action: what it is, why now, and the way to the thread where it is worked. */
export function NextActionView({ action }: { action: NextAction }) {
  return (
    <article aria-label={`Next best action · ${action.title}`} className="flex min-w-0 flex-col gap-2 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">Next best action</p>
      <p className="text-copy font-semibold">{action.title}</p>
      <p className="text-copy">{action.detail}</p>
      <Link to={`/t/${encodeURIComponent(action.targetThreadId)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        {action.linkLabel} <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
```

Create `src/workspace/thread/DisclosureLine.tsx`:

```tsx
import { Tag } from '@/kit/tag/Tag'
import { fmtTimestamp } from '@/kit/measure'
import type { Message } from '@/types/workspace'
import { DISCLOSURE_TITLES } from '@/types/workspace-prospect'

type Delivered = Extract<Message, { kind: 'disclosure_delivered' }>

/** A disclosure as it reached her: which document, and when. Its act's slip follows it. */
export function DisclosureLine({ message }: { message: Delivered }) {
  const title = DISCLOSURE_TITLES[message.document]
  return (
    <article aria-label={`Delivered · ${title}`} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <Tag>Delivered</Tag>
      <span className="text-copy">{title}</span>
      <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
    </article>
  )
}
```

Create `src/workspace/thread/PartyStepLine.tsx`:

```tsx
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { ROLE_LABEL } from '@/workspace/people/role-label'
import type { Directory, Message } from '@/types/workspace'

type Step = Extract<Message, { kind: 'party_step' }>

/** A step she took in her own thread: answered the questionnaire, shared her statements. */
export function PartyStepLine({ message, directory }: { message: Step; directory: Directory }) {
  const author = personIn(directory, message.authorId)
  return (
    <article aria-label={`${author.name} · ${message.summary}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{author.name}</span>
        <span className="text-label uppercase text-ink-3">{ROLE_LABEL[author.role]}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">{message.summary}</p>
    </article>
  )
}
```

Create `src/workspace/thread/ProspectNoteView.tsx`:

```tsx
import { fmtEasternRange, fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import type { Directory, Message } from '@/types/workspace'

type Note = Extract<Message, { kind: 'prospect_note' }>

/** A labelled note of a prospect meeting that is not a Meeting record: what happened, in the advisor's words. */
export function ProspectNoteView({ note, directory }: { note: Note; directory: Directory }) {
  return (
    <article aria-label={`Note · ${note.title}`} className="flex min-w-0 flex-col gap-2 border-l-2 border-ink pl-4">
      <p className="text-label uppercase text-ink-2">{`Note · ${note.title} · ${fmtEasternRange(note.start, note.end)}`}</p>
      <p className="whitespace-pre-line text-copy">{note.body}</p>
      <p className="text-label text-ink-3">{`${personIn(directory, note.authorId).name} · ${fmtTimestamp(note.at)}`}</p>
    </article>
  )
}
```

Create `src/workspace/thread/ProspectProposalVersionLine.tsx`:

```tsx
import { fmtTimestamp } from '@/kit/measure'
import { authorName } from '@/workspace/proposal/author-name'
import type { Directory, Message } from '@/types/workspace'

type VersionMessage = Extract<Message, { kind: 'prospect_proposal_version' }>

export function ProspectProposalVersionLine({ message, directory }: { message: VersionMessage; directory: Directory }) {
  const name = authorName(message.author, directory)
  return (
    <article aria-label={`v${message.version} · ${name}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular text-body font-semibold">{`v${message.version}`}</span>
        <span className="text-body">{name}</span>
        <span className="text-label uppercase text-ink-3">{message.author.kind === 'agent' ? 'Agent' : 'Person'}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">{message.changeSummary}</p>
    </article>
  )
}
```

Create `src/workspace/thread/OnboardingOpenedView.tsx`:

```tsx
import { Tag } from '@/kit/tag/Tag'
import { fmtDate } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { ONBOARDING_STATUS_WORDS } from '@/workspace/prospect/prospect-words'
import type { Directory, Message } from '@/types/workspace'

type Opened = Extract<Message, { kind: 'onboarding_opened' }>

/** The checklist her acceptance opened, as it was opened. The live checklist is in the thread's context. */
export function OnboardingOpenedView({ message, directory }: { message: Opened; directory: Directory }) {
  return (
    <article aria-label="Onboarding opened" className="flex min-w-0 flex-col gap-3 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">{`Onboarding opened · from ${message.acceptanceActId}`}</p>
      <ul aria-label="Onboarding items" className="flex flex-col gap-1.5">
        {message.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body">
            <span>{item.label}</span>
            <Tag>{ONBOARDING_STATUS_WORDS[item.status]}</Tag>
            <span className="text-ink-2">{personIn(directory, item.ownerId).name}</span>
            {item.due ? <span className="tabular ml-auto text-ink-3">{`due ${fmtDate(item.due)}`}</span> : null}
          </li>
        ))}
      </ul>
    </article>
  )
}
```

In `src/workspace/thread/MessageView.tsx` add, before `default`:

```tsx
    case 'next_action':
      return <NextActionView action={message} />
    case 'disclosure_delivered':
      return <DisclosureLine message={message} />
    case 'party_step':
      return <PartyStepLine message={message} directory={directory} />
    case 'prospect_note':
      return <ProspectNoteView note={message} directory={directory} />
    case 'prospect_proposal': {
      // Task 11 replaces this line with the proposal's embed.
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      return <ByAgent name={agent.name} at={message.at}><p className="text-copy">{`Drafted the ${message.title}.`}</p></ByAgent>
    }
    case 'prospect_proposal_version':
      return <ProspectProposalVersionLine message={message} directory={directory} />
    case 'onboarding_opened':
      return <OnboardingOpenedView message={message} directory={directory} />
```

In `src/workspace/workbench/CompactMessage.tsx` add:

```tsx
    case 'next_action': return <Line who="Brief" at={message.at}>{`Next best action · ${message.title}`}</Line>
    case 'disclosure_delivered': return <Line who="Record" at={message.at}>{`Delivered · ${DISCLOSURE_TITLES[message.document]}`}</Line>
    case 'party_step': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{message.summary}</Line>
    case 'prospect_note': return <Line who={personIn(directory, message.authorId).name} at={message.at}>{`Note · ${message.title}`}</Line>
    case 'prospect_proposal': return <Line who={agentName(directory, message.agentId)} at={message.at}>{`Drafted the ${message.title} (v1).`}</Line>
    case 'prospect_proposal_version': return <Line who={authorName(message.author, directory)} at={message.at}>{`v${message.version} · ${message.changeSummary}`}</Line>
    case 'onboarding_opened': return <Line who="Record" at={message.at}>{`Onboarding opened from ${message.acceptanceActId}.`}</Line>
```

In `src/workspace/thread/ActRecordSlip.tsx` pass `viewerIsExternal` as `actWording`'s third argument (the sweep in Task 2 already renamed the variable).

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-store.test.ts src/workspace/__tests__/prospect-messages.test.tsx src/mocks/data/__tests__/ src/mocks/workspace/__tests__/external-boundary.test.ts --testTimeout 30000`
Expected: PASS. `nba-routes.test.ts` now resolves `/t/th-pell` against `SEED_THREADS`.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(prospects): the prospect record and store, her two threads, the next-best action, seven message kinds and two acts with their wording

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 4: Disclosures — `deliver_disclosure` as a binding act, with its timing rules

Adrian delivers Form CRS, ADV 2A, ADV 2B and the privacy notice to Dr. Pell as recorded acts: advisor only, append-only, one delivery per document, timestamped by the session clock, each posting a delivery line and the act's slip in her thread. ADV 2B and the privacy notice wait for onboarding. The proposal send (Task 7) reuses `recordDelivery` to deliver ADV 2A in the same act.

**Files:**
- Create: `src/mocks/workspace/disclosures.ts`, `src/mocks/workspace/__tests__/disclosures.test.ts`

**Interfaces:**
- Consumes: `visibleProspect` (Task 3), `recordAct` from `proposal-acts.ts`, `DISCLOSURE_TITLES`.
- Produces:

```ts
// src/mocks/workspace/disclosures.ts
export type DisclosureFailure = { ok: false; status: 403 | 404 | 409; code: string; message: string }
export function deliveryOf(record: ProspectRecord, document: DisclosureDocument): DisclosureDelivery | undefined
export function deliverableNow(record: ProspectRecord): DisclosureDocument[]
/** Shared with the proposal send: the delivery on her record, its line in her thread, its onboarding item. Records no act. */
export function recordDelivery(record: ProspectRecord, document: DisclosureDocument, actId: string, actorId: string, at: string): void
export function deliverDisclosure(viewerId: string, prospectId: string, document: DisclosureDocument): { ok: true; act: BindingAct } | DisclosureFailure
```

- [ ] **Step 1: Write the failing test**

Create `src/mocks/workspace/__tests__/disclosures.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { SEED_LAST_SEQUENCE } from '@/mocks/data/workspace-seed'
import { eventTime } from '@/lib/clock'
import type { OnboardingChecklist } from '@/types/workspace-prospect'
import { deliverDisclosure, deliverableNow } from '../disclosures'
import { requireProspect } from '../prospects'

const ADRIAN = 'user-001'
const inHerThread = () => store().messages.filter((m) => m.threadId === 'th-pell' && m.id !== 'msg-s07')
const ONBOARDING: OnboardingChecklist = { openedAt: '2026-03-02T15:01:00.000Z', acceptanceActId: 'REC-0099', items: [
  { id: 'adv_2b', label: 'Form ADV Part 2B — deliver; receipt signed with the agreement', status: 'open', ownerId: ADRIAN, due: '2026-03-03' },
  { id: 'privacy_notice', label: 'Privacy notice — deliver', status: 'open', ownerId: ADRIAN, due: '2026-03-03' },
] }

describe('deliver_disclosure', () => {
  it('records Form CRS as a binding act at the session clock, with its line and slip in her thread', () => {
    const r = deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')
    if (!r.ok) throw new Error(r.message)
    expect(r.act).toEqual({
      id: 'REC-0001', kind: 'deliver_disclosure', actorId: ADRIAN, at: eventTime(SEED_LAST_SEQUENCE + 1), threadId: 'th-pell',
      subject: { type: 'prospect', id: 'prsp-011' }, fingerprint: expect.stringMatching(/^[0-9A-F]{8}$/), delivers: ['form_crs'],
      summary: 'Delivered Form CRS (client relationship summary) to Dr. Amanda Pell',
    })
    expect(requireProspect('prsp-011').disclosures).toEqual([{ document: 'form_crs', actId: 'REC-0001', at: r.act.at, deliveredBy: ADRIAN }])
    expect(inHerThread().map((m) => [m.kind, m.at])).toEqual([
      ['disclosure_delivered', eventTime(SEED_LAST_SEQUENCE + 1)], ['act', eventTime(SEED_LAST_SEQUENCE + 2)],
    ])
  })

  it('delivers each document once, naming the first delivery', () => {
    deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')).toEqual({
      ok: false, status: 409, code: 'ALREADY_DELIVERED', message: 'Form CRS (client relationship summary) was already delivered (REC-0001).',
    })
    expect(requireProspect('prsp-011').disclosures).toHaveLength(1)
    expect(store().acts).toHaveLength(1)
  })

  it('only the advisor delivers; other firm viewers are refused; outsiders are told she does not exist', () => {
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(deliverDisclosure(viewer, 'prsp-011', 'form_crs'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    for (const viewer of ['prsp-011', 'cli-001', 'nobody']) expect(deliverDisclosure(viewer, 'prsp-011', 'form_crs'), viewer).toMatchObject({ ok: false, status: 404, code: 'NO_PROSPECT' })
    expect(deliverDisclosure(ADRIAN, 'prsp-999', 'form_crs')).toMatchObject({ ok: false, status: 404 })
    expect(store().acts).toEqual([])
  })

  it('holds ADV 2B and the privacy notice until onboarding opens, then moves their checklist items', () => {
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'adv_2b')).toEqual({
      ok: false, status: 409, code: 'NOT_ONBOARDING', message: 'The firm delivers ADV 2B and the privacy notice when onboarding opens.',
    })
    expect(deliverableNow(requireProspect('prsp-011'))).toEqual(['form_crs', 'adv_2a'])
    requireProspect('prsp-011').onboarding = structuredCloneChecklist(ONBOARDING)
    expect(deliverableNow(requireProspect('prsp-011'))).toEqual(['form_crs', 'adv_2a', 'adv_2b', 'privacy_notice'])
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'adv_2b').ok).toBe(true)
    expect(deliverDisclosure(ADRIAN, 'prsp-011', 'privacy_notice').ok).toBe(true)
    expect(requireProspect('prsp-011').onboarding?.items.map((i) => [i.id, i.status])).toEqual([['adv_2b', 'awaiting_signature'], ['privacy_notice', 'delivered']])
    expect(deliverableNow(requireProspect('prsp-011'))).toEqual(['form_crs', 'adv_2a'])
  })
})

function structuredCloneChecklist(c: OnboardingChecklist): OnboardingChecklist {
  return { ...c, items: c.items.map((i) => ({ ...i })) }
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/disclosures.test.ts --testTimeout 30000`
Expected: FAIL — `../disclosures` does not exist.

- [ ] **Step 3: Implement**

Create `src/mocks/workspace/disclosures.ts`:

```ts
import type { BindingAct } from '@/types/workspace'
import type { DisclosureDelivery, DisclosureDocument, ProspectRecord } from '@/types/workspace-prospect'
import { DISCLOSURE_DOCUMENTS, DISCLOSURE_TITLES } from '@/types/workspace-prospect'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { recordAct } from './proposal-acts'
import { visibleProspect } from './prospects'

export type DisclosureFailure = { ok: false; status: 403 | 404 | 409; code: string; message: string }
const refuse = (status: DisclosureFailure['status'], code: string, message: string): DisclosureFailure => ({ ok: false, status, code, message })

/** Firm workflow: these two are delivered when onboarding opens (ADV 2B with the agreement for her signature). */
const AT_ONBOARDING: ReadonlySet<DisclosureDocument> = new Set<DisclosureDocument>(['adv_2b', 'privacy_notice'])

export const deliveryOf = (record: ProspectRecord, document: DisclosureDocument): DisclosureDelivery | undefined =>
  record.disclosures.find((d) => d.document === document)

/** What may be delivered now: each document not yet delivered, the onboarding ones once onboarding is open. */
export function deliverableNow(record: ProspectRecord): DisclosureDocument[] {
  return DISCLOSURE_DOCUMENTS.filter((d) => deliveryOf(record, d) === undefined && (!AT_ONBOARDING.has(d) || record.onboarding !== undefined))
}

export function recordDelivery(record: ProspectRecord, document: DisclosureDocument, actId: string, actorId: string, at: string): void {
  record.disclosures.push({ document, actId, at, deliveredBy: actorId })
  store().messages.push({ kind: 'disclosure_delivered', id: nextId('msg'), threadId: record.threadId, at, prospectId: record.id, document, actId })
  const item = record.onboarding?.items.find((i) => i.id === document)
  if (item) item.status = document === 'adv_2b' ? 'awaiting_signature' : 'delivered'
}

export function deliverDisclosure(viewerId: string, prospectId: string, document: DisclosureDocument): { ok: true; act: BindingAct } | DisclosureFailure {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return refuse(404, 'NO_PROSPECT', 'Prospect not found.')
  if (!can(viewerId, 'deliver_disclosure')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor delivers disclosures.')
  const earlier = deliveryOf(record, document)
  if (earlier) return refuse(409, 'ALREADY_DELIVERED', `${DISCLOSURE_TITLES[document]} was already delivered (${earlier.actId}).`)
  if (AT_ONBOARDING.has(document) && !record.onboarding) return refuse(409, 'NOT_ONBOARDING', 'The firm delivers ADV 2B and the privacy notice when onboarding opens.')
  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'deliver_disclosure', actorId: viewerId, at, threadId: record.threadId,
    subject: { type: 'prospect', id: record.id }, fingerprint: fingerprint(`${document}|${DISCLOSURE_TITLES[document]}`), delivers: [document],
    summary: `Delivered ${DISCLOSURE_TITLES[document]} to ${record.name}`,
  }
  // The delivery line first, at the act's time; recordAct then files the act and posts its slip after it.
  recordDelivery(record, document, act.id, viewerId, at)
  recordAct(act)
  return { ok: true, act }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/disclosures.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 5: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add src/mocks/workspace/disclosures.ts src/mocks/workspace/__tests__/disclosures.test.ts
git commit -m "feat(prospects): deliver_disclosure — advisor only, once per document, ADV 2B and the privacy notice at onboarding

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 5: The Prospect Profile and Transfer-In agents

Two scripted, deterministic agents in the internal thread, reading only the engine. **Prospect Profile** scores her questionnaire and maps it to a firm model through the shared table, showing the working. **Transfer-In** reads her statements and sets moving each holding in kind against selling it now, with the gain and a tax estimate from her cost basis at the 25 Feb close; it notes the concentration and records the 403(b) rollover only as "asked about; comparison to follow". Before her reply each says there is nothing to read; a run after her reply is a new run.

**Files:**
- Create: `src/lib/holding-period.ts`, `src/mocks/data/held-away-closes.ts`, `src/mocks/workspace/prospect-model.ts`, `src/mocks/workspace/risk-scoring.ts`, `src/mocks/workspace/transfer-in.ts`, `src/mocks/agents/prospect-profile.ts`, `src/mocks/agents/transfer-in.ts`, `src/mocks/workspace/__tests__/prospect-fixture.ts`, `src/lib/__tests__/holding-period.test.ts`, `src/mocks/workspace/__tests__/transfer-in.test.ts`, `src/mocks/agents/__tests__/prospect-agents.test.ts`
- Modify: `src/types/workspace.ts` (`AgentId`, `FigureUnit`), `src/mocks/data/people.ts` (`AGENTS`), `src/mocks/agents/registry.ts`, `src/mocks/workspace/run-key.ts`, `src/mocks/workspace/run-agent.ts`, `src/mocks/data/workspace-seed.ts` (`th-pell-work` agents), `src/kit/measure.ts` (`UNIT.points`, `fmtPoints`), `src/workspace/thread/figure-format.ts`, `src/mocks/data/__tests__/people.test.ts`, `src/mocks/handlers/__tests__/workspace-read.test.ts:48`

**Interfaces:**
- Consumes: `bandFor` (Task 1), `prospectOf`, `prospectRevision` (Task 3), `usdQuoteFor`, `MODEL_DEFINITIONS`, `modelDisplayName` (`pms.ts`), `taxRateFor`, `SINGLE_NAME_LIMIT`, `securityKind`, `claimNameOf`.
- Produces:

```ts
// src/types/workspace.ts
export type AgentId = … | 'meeting-notes' | 'prospect-profile' | 'transfer-in'
export type FigureUnit = 'USD' | 'pp' | '%' | 'sh' | 'd' | 'pts'

// src/lib/holding-period.ts
export function holdingPeriodOn(acquired: string, day: string): 'short' | 'long'

// src/mocks/data/held-away-closes.ts
export type Close = { name: string; price: number; assetClass: AssetClass }
export const HELD_AWAY_CLOSES: ReadonlyMap<string, Close>

// src/mocks/workspace/prospect-model.ts
export type ModelMix = { stocks: number; bonds: number; other: number; cash: number }
export function modelWeights(modelId: string): ReadonlyMap<AssetClass, number>
export function modelMix(modelId: string): ModelMix

// src/mocks/workspace/risk-scoring.ts
export function scoreAnswers(answers: readonly RiskAnswer[]): { ok: true; result: ProfileResult } | { ok: false; message: string }
export function profileOf(record: ProspectRecord): ProfileResult | undefined

// src/mocks/workspace/transfer-in.ts
export const PRICES_AS_OF: string                      // '2026-02-25'
export const cents: (v: number) => number
export function closeOf(symbol: string): Close         // throws for an unknown symbol
export function transferSummary(record: ProspectRecord): TransferSummary | undefined
export function concentrationOf(summary: TransferSummary): Concentration | undefined

// src/mocks/workspace/run-key.ts
export const runKeyOf: (agentId: AgentId, threadId: string, subject: Subject, revision?: number) => string

// src/mocks/workspace/__tests__/prospect-fixture.ts (test helper, used by Tasks 5–8 tests)
export const ADRIAN = 'user-001'
export function withHerReply(): ProspectRecord          // coffee, questionnaire and statements on file, as Task 8's reply records them
export function withFormCrs(): void
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/prospect-fixture.ts`:

```ts
import type { ProspectRecord } from '@/types/workspace-prospect'
import { PELL_ANSWERS, PELL_STATEMENTS, REPLY_AT } from '@/mocks/data/prospect-script'
import { requireProspect } from '../prospects'
import { deliverDisclosure } from '../disclosures'

export const ADRIAN = 'user-001'
const SCRIPTED = { presenterId: ADRIAN, path: 'scripted' } as const

/** Her coffee, questionnaire and statements on file, as the reply jump (Task 8) records them, without the clock or messages. */
export function withHerReply(): ProspectRecord {
  const record = requireProspect('prsp-011')
  record.coffee = { at: '2026-02-25T21:30:00.000Z', messageId: 'msg-fx01', authorId: ADRIAN }
  record.questionnaire = { answers: PELL_ANSWERS.map((a) => ({ ...a })), receivedAt: REPLY_AT }
  record.statements = PELL_STATEMENTS.map((s) => ({ ...s, holdings: s.holdings.map((h) => ({ ...h })) }))
  record.steps.push({ kind: 'questionnaire', at: REPLY_AT, messageId: 'msg-fx02', viaPresenter: SCRIPTED },
    { kind: 'statements', at: REPLY_AT, messageId: 'msg-fx03', viaPresenter: SCRIPTED })
  record.stage = 'discovery'
  record.stageHistory.push({ stage: 'discovery', at: REPLY_AT })
  return record
}

export function withFormCrs(): void {
  const r = deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')
  if (!r.ok) throw new Error(r.message)
}
```

Create `src/lib/__tests__/holding-period.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { holdingPeriodOn } from '@/lib/holding-period'

describe('holdingPeriodOn (more than one year is long-term)', () => {
  it.each([
    ['2025-02-25', '2026-02-25', 'short'], ['2025-02-25', '2026-02-26', 'long'], ['2016-08-15', '2026-02-25', 'long'], ['2026-01-02', '2026-02-25', 'short'],
  ] as const)('%s held to %s is %s', (acquired, day, expected) => expect(holdingPeriodOn(acquired, day)).toBe(expected))
  it('refuses a date that is not one', () => expect(() => holdingPeriodOn('2026-02-31', '2026-03-05')).toThrow('Not a date: 2026-02-31'))
})
```

Create `src/mocks/workspace/__tests__/transfer-in.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { HELD_AWAY_CLOSES } from '@/mocks/data/held-away-closes'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { requireProspect } from '../prospects'
import { closeOf, concentrationOf, transferSummary } from '../transfer-in'
import { profileOf, scoreAnswers } from '../risk-scoring'
import { modelMix } from '../prospect-model'
import { withHerReply } from './prospect-fixture'

describe('her transfer, at the 25 Feb close', () => {
  it('is nothing before her statements are on file', () => {
    expect(transferSummary(requireProspect('prsp-011'))).toBeUndefined()
  })

  it('values each holding at the close and sets in kind against selling it now, at 23.8% long-term', () => {
    const summary = transferSummary(withHerReply())
    expect(summary?.lines.map((l) => [l.symbol, l.securityKind, l.price, l.marketValue, l.unrealised, l.holdingPeriod, l.taxIfSoldNow, l.plan])).toEqual([
      ['SPY', 'fund', 520.3, 1_456_840, 446_840, 'long', 106_347.92, 'in_kind'],
      ['SYK', 'single_name', 390.2, 542_378, 481_378, 'long', 114_567.96, 'in_kind'],
    ])
    expect(summary).toMatchObject({ cash: 100_782, transferValue: 2_100_000, totalAssets: 3_000_000, pricesAsOf: '2026-02-25',
      heldAway: [{ statementId: 'stmt-pell-2', custodian: 'TIAA', accountType: '403b', value: 900_000, rollover: 'asked_about' }] })
  })

  it('names the concentration: the single stock above the single-name limit, as a share of all her assets', () => {
    const summary = transferSummary(withHerReply())
    if (!summary) throw new Error('no summary')
    const c = concentrationOf(summary)
    expect(c).toMatchObject({ symbol: 'SYK', marketValue: 542_378, totalAssets: 3_000_000, unrealised: 481_378, taxIfSoldNow: 114_567.96 })
    expect(c?.weightOfAssets).toBeCloseTo(0.18079, 5)
  })

  it('reads the book\'s quotes, and the held-away table only for what the book does not hold', () => {
    expect(closeOf('SPY').price).toBe(520.3)
    expect(closeOf('SYK').price).toBe(390.2)
    for (const symbol of HELD_AWAY_CLOSES.keys()) expect(usdQuoteFor(symbol), symbol).toBeUndefined()
    expect(() => closeOf('ZZZZ')).toThrow('No 25 Feb close for ZZZZ')
  })
})

describe('her profile', () => {
  it('scores 66: Moderate Aggressive, mapped to Growth', () => {
    expect(profileOf(withHerReply())).toEqual({ score: 66, profileLabel: 'Moderate Aggressive', floor: 56, ceiling: 75, modelId: 'mod-002', modelName: 'Growth' })
  })
  it('refuses answers that skip, repeat or invent an option', () => {
    expect(scoreAnswers([{ questionId: 'rq-01', selectedOption: 0 }])).toEqual({ ok: false, message: 'Answer every question once.' })
    const all = ['rq-01', 'rq-02', 'rq-03', 'rq-04', 'rq-05', 'rq-06', 'rq-07', 'rq-08'].map((questionId) => ({ questionId, selectedOption: 0 }))
    expect(scoreAnswers([...all.slice(0, 7), { questionId: 'rq-08', selectedOption: 9 }])).toEqual({ ok: false, message: 'rq-08 has no option 9.' })
  })
  it('reads Growth as about three quarters in stocks', () => {
    const mix = modelMix('mod-002')
    expect(mix.stocks).toBeCloseTo(0.75, 10)
    expect(mix.bonds).toBeCloseTo(0.15, 10)
    expect(mix.cash).toBeCloseTo(0.03, 10)
    expect(mix.other).toBeCloseTo(0.07, 10)
  })
})
```

Create `src/mocks/agents/__tests__/prospect-agents.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { Message } from '@/types/workspace'
import { runAgent } from '@/mocks/workspace/run-agent'
import { ADRIAN, withHerReply } from '@/mocks/workspace/__tests__/prospect-fixture'

type Finding = Extract<Message, { kind: 'agent_finding' }>
function run(agentId: 'prospect-profile' | 'transfer-in', viewer = ADRIAN, threadId = 'th-pell-work'): Finding[] {
  const r = runAgent(viewer, threadId, agentId)
  if (!r.ok) throw new Error(r.message)
  return r.findings.filter((m): m is Finding => m.kind === 'agent_finding')
}
const figure = (f: Finding | undefined, label: string) => f?.figures.find((x) => x.label === label)?.value

describe('Prospect Profile', () => {
  it('before her reply reports nothing to score; after it, measures anew', () => {
    const before = run('prospect-profile')
    expect(before.map((f) => f.claim)).toEqual(['No questionnaire is on file yet; there is nothing to score.'])
    withHerReply()
    const after = run('prospect-profile')
    expect(after.map((f) => f.claim)).toEqual([
      "Dr. Amanda Pell's answers average to a score in the moderate aggressive band.",
      "The firm's risk-profile table maps the moderate aggressive band to Growth, whose weights are below.",
    ])
    expect(after.every((f) => !before.some((b) => b.id === f.id))).toBe(true)
    expect([figure(after[0], 'Score'), figure(after[0], 'Band from'), figure(after[0], 'Band to')]).toEqual([66, 56, 75])
    expect(figure(after[1], 'Stocks')).toBeCloseTo(0.75, 10)
    expect(run('prospect-profile').map((f) => f.id)).toEqual(after.map((f) => f.id))
  })
})

describe('Transfer-In', () => {
  it('sets each holding in kind against selling it, flags the concentration, and records the rollover as asked about', () => {
    expect(run('transfer-in').map((f) => f.claim)).toEqual(['No statements are on file yet; there is nothing to read.'])
    withHerReply()
    const findings = run('transfer-in')
    expect(findings.map((f) => [f.claim, f.attention])).toEqual([
      ['SPY can move in kind; selling it now would realise a long-term gain (an estimate at the top federal rate; state tax not modelled; consult your tax professional).', 'info'],
      ['Stryker Corp. is a concentrated position; it can move in kind, which defers its long-term gain, and selling it now would realise it (an estimate at the top federal rate; state tax not modelled; consult your tax professional).', 'attention'],
      ['Cash moves as cash and carries no gain.', 'info'],
      ['Rollover of the former employer 403(b): asked about; comparison to follow.', 'info'],
    ])
    expect([figure(findings[1], 'Market value'), figure(findings[1], 'Unrealised'), figure(findings[1], 'Tax if sold now')]).toEqual([542_378, 481_378, 114_567.96])
    expect(figure(findings[1], 'Share of her assets')).toBeCloseTo(0.18079, 5)
    expect(figure(findings[1], 'Rate')).toBe(0.238)
    expect(figure(findings[3], 'Value')).toBe(900_000)
  })
})

describe('both agents', () => {
  it('state no digits in a claim, except the plan name 403(b), and never recommend a rollover', () => {
    withHerReply()
    for (const f of [...run('prospect-profile'), ...run('transfer-in')]) {
      expect(f.claim.replace(/403\(b\)|401\(k\)/g, ''), f.claim).not.toMatch(/\d/)
      expect(f.claim).not.toMatch(/recommend/i)
    }
  })
  it('never post in her thread, and she cannot run them', () => {
    expect(runAgent(ADRIAN, 'th-pell', 'transfer-in')).toMatchObject({ ok: false, status: 400, code: 'CLIENT_THREAD' })
    expect(runAgent('prsp-011', 'th-pell-work', 'transfer-in')).toMatchObject({ ok: false, status: 404 })
    expect(runAgent(ADRIAN, 'th-johnson-review', 'prospect-profile')).toMatchObject({ ok: false, status: 403, code: 'NOT_ON_THREAD' })
  })
})
```

In `src/mocks/data/__tests__/people.test.ts` the desk-agents test becomes `'the desk has nine agents, each producing one kind of output'` with `['prospect-profile', 'findings'], ['transfer-in', 'findings']` appended; in `src/mocks/handlers/__tests__/workspace-read.test.ts:48` `toHaveLength(7)` → `toHaveLength(9)`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/lib/__tests__/holding-period.test.ts src/mocks/workspace/__tests__/transfer-in.test.ts src/mocks/agents/__tests__/prospect-agents.test.ts --testTimeout 30000`
Expected: FAIL — the modules do not exist.

- [ ] **Step 3: Holding period, closes, the model's mix, scoring**

Create `src/lib/holding-period.ts`:

```ts
/**
 * IRC §1222: a gain is long-term when the asset was held more than one year, i.e. sold (or valued) after
 * the anniversary of its acquisition. Dates are `YYYY-MM-DD`.
 */
export function holdingPeriodOn(acquired: string, day: string): 'short' | 'long' {
  const start = new Date(`${acquired}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== acquired) throw new Error(`Not a date: ${acquired}`)
  const anniversary = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate())).toISOString().slice(0, 10)
  return day > anniversary ? 'long' : 'short'
}
```

Create `src/mocks/data/held-away-closes.ts`:

```ts
import type { AssetClass } from '@/types/portfolio'

export type Close = { name: string; price: number; assetClass: AssetClass }

/**
 * The 25 Feb 2026 close of held-away securities the book does not hold, for valuing a prospect's
 * statements. A security the book holds is priced by `usdQuoteFor` and must not appear here: one price, one place.
 */
export const HELD_AWAY_CLOSES: ReadonlyMap<string, Close> = new Map<string, Close>([
  ['SYK', { name: 'Stryker Corp.', price: 390.2, assetClass: 'us_equity' }],
])
```

Create `src/mocks/workspace/prospect-model.ts`:

```ts
import type { AssetClass } from '@/types/portfolio'
import { MODEL_DEFINITIONS } from '@/mocks/handlers/pms'

export type ModelMix = { stocks: number; bonds: number; other: number; cash: number }
const STOCKS: ReadonlySet<AssetClass> = new Set<AssetClass>(['us_equity', 'intl_equity', 'emerging_markets'])

export function modelWeights(modelId: string): ReadonlyMap<AssetClass, number> {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  if (!model) throw new Error(`No model ${modelId}`)
  return new Map(model.assetClasses.map((a) => [a.assetClass, a.targetWeight]))
}

/** A model in four words a prospect reads: stocks, bonds, everything else, cash. */
export function modelMix(modelId: string): ModelMix {
  const weights = [...modelWeights(modelId)]
  const sum = (keep: (c: AssetClass) => boolean) => weights.filter(([c]) => keep(c)).reduce((s, [, w]) => s + w, 0)
  const stocks = sum((c) => STOCKS.has(c))
  const bonds = sum((c) => c === 'fixed_income')
  const cash = sum((c) => c === 'cash')
  return { stocks, bonds, cash, other: sum((c) => !STOCKS.has(c) && c !== 'fixed_income' && c !== 'cash') }
}
```

Create `src/mocks/workspace/risk-scoring.ts`:

```ts
import type { RiskAnswer } from '@/types/onboarding'
import type { ProfileResult, ProspectRecord } from '@/types/workspace-prospect'
import { riskQuestions } from '@/mocks/data/onboarding'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { bandFor } from '@/lib/risk-profile'

/** Every question answered once, inside its options: the rounded average of the option scores, read through the firm's table. */
export function scoreAnswers(answers: readonly RiskAnswer[]): { ok: true; result: ProfileResult } | { ok: false; message: string } {
  const ids = answers.map((a) => a.questionId)
  if (ids.length !== riskQuestions.length || new Set(ids).size !== ids.length || riskQuestions.some((q) => !ids.includes(q.id))) {
    return { ok: false, message: 'Answer every question once.' }
  }
  let total = 0
  for (const answer of answers) {
    const option = Number.isInteger(answer.selectedOption) ? riskQuestions.find((q) => q.id === answer.questionId)?.options[answer.selectedOption] : undefined
    if (!option) return { ok: false, message: `${answer.questionId} has no option ${answer.selectedOption}.` }
    total += option.score
  }
  const score = Math.round(total / answers.length)
  const band = bandFor(score)
  return { ok: true, result: { score, profileLabel: band.label, floor: band.floor, ceiling: band.ceiling, modelId: band.modelId, modelName: modelDisplayName(band.modelId) } }
}

export function profileOf(record: ProspectRecord): ProfileResult | undefined {
  if (!record.questionnaire) return undefined
  const scored = scoreAnswers(record.questionnaire.answers)
  if (!scored.ok) throw new Error(`The answers on file for ${record.id} do not score: ${scored.message}`)
  return scored.result
}
```

- [ ] **Step 4: The transfer reading**

Create `src/mocks/workspace/transfer-in.ts`:

```ts
import type { Concentration, HeldAwayLine, Holding, ProspectRecord, Statement, TransferLine, TransferSummary } from '@/types/workspace-prospect'
import { HELD_AWAY_CLOSES, type Close } from '@/mocks/data/held-away-closes'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { holdingPeriodOn } from '@/lib/holding-period'
import { taxRateFor } from '@/lib/tax-rules'
import { SINGLE_NAME_LIMIT, securityKind } from '@/lib/security-master'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/** The engine's day: her holdings are valued at the 25 Feb close and their holding periods read on it, whatever the session clock says. */
export const PRICES_AS_OF = MOCK_TODAY_ISO
export const cents = (v: number) => Math.round(v * 100) / 100

export function closeOf(symbol: string): Close {
  const close = usdQuoteFor(symbol) ?? HELD_AWAY_CLOSES.get(symbol)
  if (!close) throw new Error(`No 25 Feb close for ${symbol}`)
  return close
}

function lineOf(statement: Statement, holding: Holding): TransferLine {
  const kind = securityKind(holding.symbol, holding.assetClass)
  if (kind === 'cash') throw new Error(`${statement.id} lists cash as a holding; cash is the statement's own field`)
  const price = closeOf(holding.symbol).price
  const marketValue = cents(holding.quantity * price)
  const unrealised = cents(marketValue - holding.costBasis)
  const holdingPeriod = holdingPeriodOn(holding.acquired, PRICES_AS_OF)
  return {
    statementId: statement.id, symbol: holding.symbol, name: holding.name, assetClass: holding.assetClass, securityKind: kind,
    quantity: holding.quantity, price, marketValue, costBasis: holding.costBasis, acquired: holding.acquired, holdingPeriod, unrealised,
    taxIfSoldNow: unrealised > 0 ? cents(unrealised * taxRateFor(holdingPeriod)) : 0, plan: 'in_kind',
  }
}

const statementValue = (s: Statement) => cents(s.holdings.reduce((sum, h) => sum + h.quantity * closeOf(h.symbol).price, 0) + s.cash)

/** What she would transfer (her taxable account, in kind) and what stays held away (the 403(b)), at the 25 Feb close. */
export function transferSummary(record: ProspectRecord): TransferSummary | undefined {
  const taxable = record.statements.find((s) => s.accountType === 'taxable_brokerage')
  if (!taxable) return undefined
  const lines = taxable.holdings.map((h) => lineOf(taxable, h))
  const transferValue = cents(lines.reduce((s, l) => s + l.marketValue, 0) + taxable.cash)
  const heldAway: HeldAwayLine[] = record.statements.filter((s) => s.accountType === '403b')
    .map((s) => ({ statementId: s.id, custodian: s.custodian, accountType: '403b', value: statementValue(s), rollover: 'asked_about' }))
  const totalAssets = cents(transferValue + heldAway.reduce((s, h) => s + h.value, 0))
  return { lines, cash: taxable.cash, heldAway, transferValue, totalAssets, pricesAsOf: PRICES_AS_OF }
}

/** The largest single stock, when it is more than the single-name limit of everything she holds. */
export function concentrationOf(summary: TransferSummary): Concentration | undefined {
  const largest = summary.lines.filter((l) => l.securityKind === 'single_name').sort((a, b) => b.marketValue - a.marketValue)[0]
  if (!largest) return undefined
  const weightOfAssets = largest.marketValue / summary.totalAssets
  return weightOfAssets > SINGLE_NAME_LIMIT ? {
    symbol: largest.symbol, name: largest.name, marketValue: largest.marketValue, weightOfAssets, totalAssets: summary.totalAssets,
    unrealised: largest.unrealised, taxIfSoldNow: largest.taxIfSoldNow,
  } : undefined
}
```

- [ ] **Step 5: The two agents, registered on her internal thread**

Create `src/mocks/agents/prospect-profile.ts`:

```ts
import type { AgentContext, AgentFinding } from './agent'
import { prospectOf } from '@/mocks/workspace/prospects'
import { profileOf } from '@/mocks/workspace/risk-scoring'
import { modelMix } from '@/mocks/workspace/prospect-model'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/** Scores her questionnaire and maps it to the firm's model through the one table, showing the working. Contacts nobody; recommends no account. */
export function runProspectProfile({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'prospect') throw new Error(`Prospect Profile works on a prospect, not a ${subject.type}`)
  const record = prospectOf(subject.id)
  if (!record) throw new Error(`Prospect Profile: no prospect ${subject.id}`)
  const profile = profileOf(record)
  if (!profile || !record.questionnaire) {
    return [{ claim: 'No questionnaire is on file yet; there is nothing to score.', attention: 'info', figures: [], citations: [{ source: 'Prospect record', asOf }] }]
  }
  const band = profile.profileLabel.toLowerCase()
  const mix = modelMix(profile.modelId)
  return [
    {
      claim: `${record.name}'s answers average to a score in the ${band} band.`, attention: 'info',
      figures: [
        { label: 'Score', value: profile.score, unit: 'pts', source: 'questionnaire.average' },
        { label: 'Band from', value: profile.floor, unit: 'pts', source: 'riskProfileTable.floor' },
        { label: 'Band to', value: profile.ceiling, unit: 'pts', source: 'riskProfileTable.ceiling' },
      ],
      citations: [{ source: `Risk questionnaire · answered by ${record.name}`, asOf: record.questionnaire.receivedAt }],
    },
    {
      claim: `The firm's risk-profile table maps the ${band} band to ${profile.modelName}, whose weights are below.`, attention: 'info',
      figures: [
        { label: 'Stocks', value: mix.stocks, unit: '%', source: 'model.targetWeight' },
        { label: 'Bonds', value: mix.bonds, unit: '%', source: 'model.targetWeight' },
        { label: 'Alternatives and commodities', value: mix.other, unit: '%', source: 'model.targetWeight' },
        { label: 'Cash', value: mix.cash, unit: '%', source: 'model.targetWeight' },
      ],
      citations: [{ source: 'Risk profile table · firm policy', asOf: MOCK_TODAY_ISO }, { source: `Model · ${profile.modelName}`, asOf: MOCK_TODAY_ISO }],
    },
  ]
}
```

Create `src/mocks/agents/transfer-in.ts`:

```ts
import type { AgentContext, AgentFinding } from './agent'
import { prospectOf } from '@/mocks/workspace/prospects'
import { concentrationOf, transferSummary } from '@/mocks/workspace/transfer-in'
import { taxRateFor } from '@/lib/tax-rules'
import { SINGLE_NAME_LIMIT } from '@/lib/security-master'
import { claimNameOf } from './claim-name'

const TAX_CAVEAT = 'an estimate at the top federal rate; state tax not modelled; consult your tax professional'

/** Reads her statements: each holding moved in kind against sold now, with the gain and a tax estimate. Sells nothing; recommends no rollover. */
export function runTransferIn({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'prospect') throw new Error(`Transfer-In works on a prospect, not a ${subject.type}`)
  const record = prospectOf(subject.id)
  if (!record) throw new Error(`Transfer-In: no prospect ${subject.id}`)
  const summary = transferSummary(record)
  const taxable = record.statements.find((s) => s.accountType === 'taxable_brokerage')
  if (!summary || !taxable) {
    return [{ claim: 'No statements are on file yet; there is nothing to read.', attention: 'info', figures: [], citations: [{ source: 'Prospect record', asOf }] }]
  }
  const concentration = concentrationOf(summary)
  const statement = { source: `Statement · ${taxable.custodian} · taxable brokerage`, asOf: taxable.asOf }
  const holdings: AgentFinding[] = summary.lines.map((l) => {
    const name = claimNameOf(l.symbol, l.name)
    const result = `${l.holdingPeriod === 'long' ? 'long-term' : 'short-term'} ${l.unrealised >= 0 ? 'gain' : 'loss'}`
    const concentrated = concentration?.symbol === l.symbol
    return {
      claim: concentrated
        ? `${name} is a concentrated position; it can move in kind, which defers its ${result}, and selling it now would realise it (${TAX_CAVEAT}).`
        : `${name} can move in kind; selling it now would realise a ${result} (${TAX_CAVEAT}).`,
      attention: concentrated ? 'attention' : 'info',
      figures: [
        { label: 'Market value', value: l.marketValue, unit: 'USD', source: 'transfer.marketValue' },
        { label: 'Cost basis', value: l.costBasis, unit: 'USD', source: 'statement.costBasis' },
        { label: 'Unrealised', value: l.unrealised, unit: 'USD', source: 'transfer.unrealised' },
        { label: 'Tax if sold now', value: l.taxIfSoldNow, unit: 'USD', source: 'transfer.taxIfSoldNow' },
        { label: 'Rate', value: taxRateFor(l.holdingPeriod), unit: '%', source: 'taxRateFor' },
        ...(concentrated && concentration ? [
          { label: 'Share of her assets', value: concentration.weightOfAssets, unit: '%' as const, source: 'concentration.weightOfAssets' },
          { label: 'Single-name limit', value: SINGLE_NAME_LIMIT, unit: '%' as const, source: 'SINGLE_NAME_LIMIT' },
        ] : []),
      ],
      citations: [statement, { source: `Close · ${l.symbol}`, asOf: summary.pricesAsOf }],
    }
  })
  const cash: AgentFinding = { claim: 'Cash moves as cash and carries no gain.', attention: 'info',
    figures: [{ label: 'Cash', value: summary.cash, unit: 'USD', source: 'statement.cash' }], citations: [statement] }
  const heldAway: AgentFinding[] = summary.heldAway.map((h) => ({
    claim: 'Rollover of the former employer 403(b): asked about; comparison to follow.', attention: 'info',
    figures: [{ label: 'Value', value: h.value, unit: 'USD', source: 'statement.value' }],
    citations: [{ source: `Statement · ${h.custodian} · 403(b)`, asOf: record.statements.find((s) => s.id === h.statementId)?.asOf ?? asOf }],
  }))
  return [...holdings, cash, ...heldAway]
}
```

In `src/types/workspace.ts`: `AgentId` gains `| 'prospect-profile' | 'transfer-in'`; `FigureUnit` gains `| 'pts'`. In `src/kit/measure.ts`: `UNIT` gains `points: 'pts'` and add `export const fmtPoints = (n: number) => unsigned(n, 0, 0)`. In `src/workspace/thread/figure-format.ts` `BY_UNIT` gains `pts: { format: fmtPoints, unit: UNIT.points },`.

In `src/mocks/data/people.ts` `AGENTS`, append after `meeting-notes`:

```ts
  { id: 'prospect-profile', name: 'Prospect Profile', produces: 'findings', scope: { may: ['score the questionnaire', "map it to the firm's model, showing the working"], mayNot: ['contact the prospect', 'recommend accounts', 'post in a client thread'] } },
  { id: 'transfer-in', name: 'Transfer-In', produces: 'findings', scope: { may: ['read her statements', 'set moving each holding in kind against selling it, with the gain and a tax estimate'], mayNot: ['sell', 'recommend a rollover', 'post in a client thread'] } },
```

and the `proposal` agent's `may` becomes `['draft and revise proposals under constraints', 'draft and revise a prospect proposal under constraints']`.

In `src/mocks/agents/registry.ts` `RUNNERS` gains `['prospect-profile', runProspectProfile]` and `['transfer-in', runTransferIn]`. In `src/mocks/data/workspace-seed.ts`, `th-pell-work`'s `agentIds` becomes `['prospect-profile', 'transfer-in', 'proposal']`.

Replace `runKeyOf` in `src/mocks/workspace/run-key.ts`:

```ts
/**
 * One agent run: the same agent, thread, subject and as-of always find the same thing — until the
 * session's fills move the book, or (for a prospect) what is on file about her changes; then it is a new run.
 */
export const runKeyOf = (agentId: AgentId, threadId: string, subject: Subject, revision?: number): string => {
  const book = bookVersion()
  return `${agentId}|${threadId}|${subject.type}:${subject.id}|${MOCK_NOW_ISO}${book > 0 ? `|book ${book}` : ''}${revision === undefined ? '' : `|on file ${revision}`}`
}
```

In `src/mocks/workspace/run-agent.ts` `resolveRun`: `const runKey = runKeyOf(agentId, thread.id, subject, subject.type === 'prospect' ? prospectRevision(subject.id) : undefined)` (import `prospectRevision` from `./prospects`). The agents read the store only inside `run`, so the import cycle store → brief → registry → agents → prospects → store is never evaluated at import time.

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/lib/__tests__/holding-period.test.ts src/mocks/workspace/__tests__/transfer-in.test.ts src/mocks/agents/__tests__/ src/mocks/data/__tests__/people.test.ts src/mocks/handlers/__tests__/workspace-read.test.ts src/workspace/__tests__/figure-format.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(agents): Prospect Profile and Transfer-In — her score through the firm's table; each holding in kind against sold now, at the 25 Feb close

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 6: The prospect proposal — versions, revise, preview, and what she will read

The Proposal Agent drafts a prospect proposal in the internal thread from the engine's readings: the model from her profile (Growth), one individual taxable account, the transfer plan (everything in kind, the concentration's gain and the tax if sold now, nothing sold), the 403(b) recorded only as "asked about; comparison to follow", fees from the firm's tiered schedule, "Prices as of 25 Feb 2026 close." Versions are append-only and fingerprinted; the one revision documents a staged sale in two or three annual tranches as an option to decide with her CPA. Each version carries the client-readable summary she will receive, and each proposal carries the best-interest draft for its latest version.

**Files:**
- Create: `src/mocks/agents/prospect-proposal-agent.ts`, `src/mocks/workspace/prospect-proposals.ts`, `src/mocks/workspace/best-interest.ts`, `src/mocks/workspace/__tests__/prospect-proposals.test.ts`
- Modify: `src/kit/measure.ts` (`clientRate`, `fmtDayMonthYear`), `src/kit/__tests__/measure.test.ts`

**Interfaces:**
- Consumes: `profileOf`, `transferSummary`, `concentrationOf`, `cents`, `modelWeights`, `modelMix` (Task 5); `visibleProspect`, `requireProspect` (Task 3); `proposalTemplates`, `toFeeTiers` (Task 1); `blendedTieredFee`; `buildClientRateDisclosure`, `TAX_RATE_BASIS`, `taxRateFor`; `bandFor`, `lowerRiskBand`.
- Produces:

```ts
// src/kit/measure.ts
export function clientRate(fraction: number): string        // 0.0099286 → "0.99%"
export function fmtDayMonthYear(iso: string): string         // "2026-02-25" → "25 Feb 2026"

// src/mocks/agents/prospect-proposal-agent.ts
export type ProspectVersionContent = Omit<ProspectProposalVersion, 'n' | 'author' | 'createdAt' | 'changeSummary' | 'clientSummary' | 'fingerprint'>
export function prospectProposalTitle(record: ProspectRecord): string                      // "Pell proposal"
export function prospectDraftSummary(content: ProspectVersionContent): string
export function prospectChangeSummary(constraints: readonly ProspectConstraint[], content: ProspectVersionContent): string
export function clientSummaryOf(record: ProspectRecord, content: ProspectVersionContent): string

// src/mocks/workspace/best-interest.ts
export const ROLLOVER_LINE = 'Rollover of the former employer 403(b): asked about; comparison to follow.'
export function bestInterestDraftOf(version: ProspectVersionContent): BestInterestDraft

// src/mocks/workspace/prospect-proposals.ts
export type ProspectProposalFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type BuiltProspectVersion = ProspectVersionContent & { clientSummary: string; fingerprint: string }
export const FIRM_FEE_SCHEDULE_ID = 'tpl-001'
export function prospectProposalById(id: string): ProspectProposal | undefined
export function latestProspectVersion(proposal: ProspectProposal): ProspectProposalVersion
export function visibleProspectProposal(viewerId: string, proposalId: string): ProspectProposal | undefined
export function prospectProposalDetail(proposal: ProspectProposal): ProspectProposalDetail
export function buildProspectVersion(record: ProspectRecord, constraints: readonly ProspectConstraint[]): { ok: true; built: BuiltProspectVersion } | ProspectProposalFailure
export function createProspectProposal(viewerId: string, prospectId: string): { ok: true; detail: ProspectProposalDetail; created: boolean } | ProspectProposalFailure
export function reviseProspectProposal(viewerId: string, proposalId: string, constraints: readonly ProspectConstraint[]): { ok: true; detail: ProspectProposalDetail } | ProspectProposalFailure
export function previewProspectRevision(viewerId: string, proposalId: string, constraints: readonly ProspectConstraint[]): { ok: true; preview: BuiltProspectVersion } | ProspectProposalFailure
export function readableProspectProposals(viewerId: string, prospectId: string): ProspectProposalDetail[] | undefined
export function parseProspectConstraints(value: unknown): { ok: true; value: ProspectConstraint[] } | { ok: false; message: string }
```

- [ ] **Step 1: Write the failing tests**

Add to `src/kit/__tests__/measure.test.ts`:

```ts
import { clientRate, fmtDayMonthYear } from '@/kit/measure'

describe('prospect-proposal formats', () => {
  it('states a fee rate to two places and a price date as the proposal says it', () => {
    expect(clientRate(20_850 / 2_100_000)).toBe('0.99%')
    expect(fmtDayMonthYear('2026-02-25')).toBe('25 Feb 2026')
  })
})
```

Create `src/mocks/workspace/__tests__/prospect-proposals.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { requireProspect } from '../prospects'
import {
  buildProspectVersion, createProspectProposal, parseProspectConstraints, previewProspectRevision, readableProspectProposals, reviseProspectProposal,
} from '../prospect-proposals'
import { ADRIAN, withHerReply } from './prospect-fixture'

const created = () => {
  const r = createProspectProposal(ADRIAN, 'prsp-011')
  if (!r.ok) throw new Error(r.message)
  return r.detail
}
const digitFree = (text: string) => expect(text.replace(/403\(b\)|401\(k\)/g, ''), text).not.toMatch(/\d/)

describe('drafting her proposal', () => {
  it('waits for her questionnaire and her statements', () => {
    expect(createProspectProposal(ADRIAN, 'prsp-011')).toEqual({ ok: false, status: 409, code: 'NO_QUESTIONNAIRE', message: 'Her questionnaire is not on file yet.' })
    const record = withHerReply()
    record.statements = []
    expect(createProspectProposal(ADRIAN, 'prsp-011')).toEqual({ ok: false, status: 409, code: 'NO_STATEMENTS', message: 'Her statements are not on file yet.' })
    expect(store().prospectProposals).toEqual([])
  })

  it('v1: Growth, one taxable account, everything in kind, nothing sold, the tiered fee, the 25 Feb close', () => {
    withHerReply()
    const detail = created()
    expect(detail).toMatchObject({ id: 'pprop-0001', prospectId: 'prsp-011', title: 'Pell proposal', threadId: 'th-pell-work' })
    const v1 = detail.versions[0]
    expect(v1).toMatchObject({
      n: 1, author: { kind: 'agent', agentId: 'proposal' }, constraints: [], score: 66, profileLabel: 'Moderate Aggressive', modelId: 'mod-002', modelName: 'Growth',
      cash: 100_782, transferValue: 2_100_000, totalAssets: 3_000_000, tranches: [], pricesAsOf: '2026-02-25',
      fees: { scheduleName: 'Comprehensive Wealth Management', base: 2_100_000, annual: 20_850 },
      heldAway: [{ custodian: 'TIAA', value: 900_000, rollover: 'asked_about' }],
      concentration: { symbol: 'SYK', unrealised: 481_378, taxIfSoldNow: 114_567.96 },
      changeSummary: "Drafted from her questionnaire's model, Growth: one individual taxable account, everything transferred in kind, nothing sold.",
    })
    expect(v1?.transfer.every((l) => l.plan === 'in_kind')).toBe(true)
    expect(v1?.fees.blendedRate).toBeCloseTo(0.0099286, 6)
    expect(v1?.sleeves.find((s) => s.assetClass === 'us_equity')).toMatchObject({ target: 0.55 })
    expect(v1?.sleeves.find((s) => s.assetClass === 'us_equity')?.transferred).toBeCloseTo(1_999_218 / 2_100_000, 10)
    expect(v1?.fingerprint).toMatch(/^[0-9A-F]{8}$/)
    digitFree(v1?.changeSummary ?? '')
    expect(store().messages.filter((m) => m.threadId === 'th-pell-work').map((m) => m.kind)).toEqual(['prospect_proposal'])
  })

  it('writes what she will read: plain figures, the rollover asked about, the estimates hedged, the close named, no recommendation to roll over', () => {
    withHerReply()
    const summary = created().versions[0]?.clientSummary ?? ''
    expect(summary).toContain('Dear Dr. Pell,')
    expect(summary).toContain('Portfolio: Growth')
    expect(summary).toContain('Stryker Corp. (SYK): 1,390 shares, $542,378, about 18.1% of your assets.')
    expect(summary).toContain('a long-term gain of about $481,400, with an estimated federal tax of about $114,600 (estimate; consult your tax professional)')
    expect(summary).toContain('Your TIAA 403(b) rollover: asked about; comparison to follow.')
    expect(summary).toContain('Fees: $20,850 a year on $2,100,000 (a blended 0.99%), from our tiered schedule.')
    expect(summary).toContain('State tax is not modeled.')
    expect(summary).toContain('Prices as of 25 Feb 2026 close.')
    expect(summary).toContain('Adrian Hale\nLarkfield Advisory')
    expect(summary).not.toMatch(/recommend|cleared|would exceed/i)
  })

  it('a second ask returns the proposal already drafted', () => {
    withHerReply()
    created()
    expect(createProspectProposal(ADRIAN, 'prsp-011')).toMatchObject({ ok: true, created: false, detail: { id: 'pprop-0001' } })
    expect(store().prospectProposals).toHaveLength(1)
  })
})

describe('revising it', () => {
  it('documents a staged sale in two tax years, the tranches tying to the whole gain; nothing sold', () => {
    withHerReply()
    const { id } = created()
    const r = reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 2 }])
    if (!r.ok) throw new Error(r.message)
    const v2 = r.detail.versions[1]
    expect(v2?.tranches).toEqual([
      { n: 1, taxYear: 2026, shares: 695, proceeds: 271_189, gain: 240_689, tax: 57_283.98 },
      { n: 2, taxYear: 2027, shares: 695, proceeds: 271_189, gain: 240_689, tax: 57_283.98 },
    ])
    expect(v2?.changeSummary).toBe('Documented a staged sale of Stryker Corp. over two tax years, to decide with her CPA; nothing sold.')
    expect(v2?.clientSummary).toContain('One option to decide with your CPA: selling Stryker Corp. in two parts over the 2026 and 2027 tax years')
    expect(v2?.fingerprint).not.toBe(r.detail.versions[0]?.fingerprint)
    expect(store().messages.filter((m) => m.kind === 'prospect_proposal_version').map((m) => m.kind === 'prospect_proposal_version' && m.version)).toEqual([2])
  })

  it('three tranches give the remainder to the last; a revision that changes nothing is refused; removing the staging is a version', () => {
    withHerReply()
    const { id } = created()
    const three = reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 3 }])
    if (!three.ok) throw new Error(three.message)
    expect(three.detail.versions[1]?.tranches.map((t) => t.shares)).toEqual([463, 463, 464])
    expect(three.detail.versions[1]?.tranches.reduce((s, t) => s + t.gain, 0)).toBeCloseTo(481_378, 2)
    expect(reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 3 }])).toEqual({ ok: false, status: 409, code: 'NO_CHANGE', message: 'v2 already says that.' })
    const back = reviseProspectProposal(ADRIAN, id, [])
    if (!back.ok) throw new Error(back.message)
    expect(back.detail.versions[2]?.changeSummary).toBe('Removed the staged sale; everything transferred in kind, nothing sold.')
    expect(back.detail.versions[2]?.fingerprint).toBe(back.detail.versions[0]?.fingerprint)
  })

  it('previews a revision without saving it', () => {
    withHerReply()
    const { id } = created()
    const preview = previewProspectRevision(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 2 }])
    expect(preview.ok && preview.preview.tranches).toHaveLength(2)
    expect(store().prospectProposals[0]?.versions).toHaveLength(1)
  })

  it('is closed once sent', () => {
    withHerReply()
    const { id } = created()
    requireProspect('prsp-011').sent = { proposalId: id, version: 1, actId: 'REC-0009', messageId: 'msg-0099', at: '2026-02-26T15:00:00.000Z' }
    expect(reviseProspectProposal(ADRIAN, id, [{ kind: 'stage_diversification', tranches: 2 }])).toEqual({
      ok: false, status: 409, code: 'ALREADY_SENT', message: 'v1 was sent to her (REC-0009); this proposal is closed.',
    })
  })
})

describe('who may draft and read it', () => {
  it('members of her internal thread draft; Mark reads but does not draft; she and Robert are told it does not exist', () => {
    withHerReply()
    expect(createProspectProposal('cco-001', 'prsp-011')).toMatchObject({ ok: false, status: 403, code: 'NOT_A_MEMBER' })
    for (const viewer of ['prsp-011', 'cli-001']) expect(createProspectProposal(viewer, 'prsp-011')).toMatchObject({ ok: false, status: 404 })
    const { id } = created()
    expect(readableProspectProposals('cco-001', 'prsp-011')?.map((p) => p.id)).toEqual([id])
    expect(readableProspectProposals('prsp-011', 'prsp-011')).toBeUndefined()
    expect(reviseProspectProposal('prsp-011', id, [])).toMatchObject({ ok: false, status: 404 })
  })

  it('carries the best-interest draft for the latest version: a lower-risk model and staying self-directed, each with its cost', () => {
    withHerReply()
    const draft = created().bestInterestDraft
    expect(draft).toMatchObject({ score: 66, profileLabel: 'Moderate Aggressive', modelId: 'mod-002', modelName: 'Growth',
      costs: { scheduleName: 'Comprehensive Wealth Management', annualFee: 20_850 }, concentration: { symbol: 'SYK' },
      rollover: 'Rollover of the former employer 403(b): asked about; comparison to follow.' })
    expect(draft.alternatives.map((a) => [a.kind, a.name, a.annualFee])).toEqual([['lower_risk_model', 'Balanced Growth', 20_850], ['self_directed', 'Staying self-directed', 0]])
  })
})

describe('parsing a revision', () => {
  it.each([
    [[], true], [[{ kind: 'stage_diversification', tranches: 2 }], true], [[{ kind: 'stage_diversification', tranches: 4 }], false],
    [[{ kind: 'harvest_only' }], false], ['nope', false], [[{ kind: 'stage_diversification', tranches: 2 }, { kind: 'stage_diversification', tranches: 3 }], false],
  ] as const)('%j → %s', (value, ok) => expect(parseProspectConstraints(value).ok).toBe(ok))
})

describe('building is pure', () => {
  it('the same record and constraints build the same fingerprint', () => {
    const record = withHerReply()
    const a = buildProspectVersion(record, [])
    const b = buildProspectVersion(record, [])
    expect(a.ok && b.ok && a.built.fingerprint === b.built.fingerprint).toBe(true)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-proposals.test.ts src/kit/__tests__/measure.test.ts --testTimeout 30000`
Expected: FAIL — the modules and formats do not exist.

- [ ] **Step 3: Two client formats**

Add to `src/kit/measure.ts`:

```ts
/** A fee rate in client copy, to two places: "0.99%". */
export function clientRate(fraction: number): string {
  return `${unsigned(fraction, 2, 2, 2)}%`
}

const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
/** A date as the proposal's price line states it: "25 Feb 2026". */
export function fmtDayMonthYear(iso: string): string {
  return dayMonthYear.format(parseIso(iso))
}
```

- [ ] **Step 4: The agent's words and what she reads**

Create `src/mocks/agents/prospect-proposal-agent.ts`:

```ts
import type { ProspectConstraint, ProspectProposalVersion, ProspectRecord } from '@/types/workspace-prospect'
import { prospects } from '@/mocks/data/prospects'
import { modelMix } from '@/mocks/workspace/prospect-model'
import { FIRM_NAME } from '@/lib/firm'
import { TAX_RATE_BASIS, buildClientRateDisclosure } from '@/lib/tax-rules'
import { joinWords } from '@/lib/words'
import { clientMoney, clientPercent, clientRate, fmtDayMonthYear, fmtQuantity } from '@/kit/measure'
import { claimNameOf } from './claim-name'

export type ProspectVersionContent = Omit<ProspectProposalVersion, 'n' | 'author' | 'createdAt' | 'changeSummary' | 'clientSummary' | 'fingerprint'>

const TRANCHE_WORDS: Readonly<Record<2 | 3, string>> = { 2: 'two', 3: 'three' }
/** Client copy states estimates to the nearest hundred dollars, as the client letter does. */
const aboutMoney = (v: number) => clientMoney(Math.round(v / 100) * 100)
const lastNameOf = (fullName: string) => fullName.split(' ').pop() ?? fullName

export const prospectProposalTitle = (record: ProspectRecord): string => `${lastNameOf(record.name)} proposal`

export function prospectDraftSummary(content: ProspectVersionContent): string {
  return `Drafted from her questionnaire's model, ${content.modelName}: one individual taxable account, everything transferred in kind, nothing sold.`
}

export function prospectChangeSummary(constraints: readonly ProspectConstraint[], content: ProspectVersionContent): string {
  const staged = constraints.find((c) => c.kind === 'stage_diversification')
  if (staged && content.concentration) {
    return `Documented a staged sale of ${claimNameOf(content.concentration.symbol, content.concentration.name)} over ${TRANCHE_WORDS[staged.tranches]} tax years, to decide with her CPA; nothing sold.`
  }
  return 'Removed the staged sale; everything transferred in kind, nothing sold.'
}

/** What she reads when the approved version is sent: the firm's plain language, each figure the version's, formatted for a client. */
export function clientSummaryOf(record: ProspectRecord, c: ProspectVersionContent): string {
  const advisor = prospects.find((p) => p.id === record.id)?.assignedAdvisor
  if (!advisor) throw new Error(`Prospect ${record.id} has no assigned advisor`)
  const custodian = record.statements.find((s) => s.accountType === 'taxable_brokerage')?.custodian
  if (!custodian) throw new Error(`Prospect ${record.id} has no taxable statement`)
  const mix = modelMix(c.modelId)
  const holdings = c.transfer.map((l) => {
    const head = `- ${l.name} (${l.symbol}): ${fmtQuantity(l.quantity)} shares, ${clientMoney(l.marketValue)}`
    if (c.concentration?.symbol !== l.symbol) return `${head}.`
    const term = l.holdingPeriod === 'long' ? 'long-term' : 'short-term'
    return `${head}, about ${clientPercent(c.concentration.weightOfAssets)} of your assets. Selling it now would realise a ${term} gain of about ${aboutMoney(l.unrealised)}, with an estimated federal tax of about ${aboutMoney(l.taxIfSoldNow)} (estimate; consult your tax professional).`
  })
  const first = c.tranches[0]
  const staged = first && c.concentration ? [
    '',
    `One option to decide with your CPA: selling ${c.concentration.name} in ${TRANCHE_WORDS[c.tranches.length === 3 ? 3 : 2]} parts over the ${joinWords(c.tranches.map((t) => String(t.taxYear)))} tax years, a gain of about ${aboutMoney(first.gain)} in each, with an estimated federal tax of about ${aboutMoney(first.tax)} each (estimate; consult your tax professional). Nothing is sold unless you decide to.`,
  ] : []
  return [
    `Dear ${record.salutation},`,
    '',
    'Thank you for your questionnaire and your statements. This is our proposal.',
    '',
    `Portfolio: ${c.modelName}, the firm's model for your answers: about ${clientPercent(mix.stocks)} in stocks and ${clientPercent(1 - mix.stocks)} in bonds, alternatives, commodities and cash.`,
    'Account: one individual taxable account in your name.',
    '',
    `Moving your ${custodian} account: everything moves in kind; nothing is sold to make the move.`,
    ...holdings,
    `- Cash: ${clientMoney(c.cash)}.`,
    ...staged,
    '',
    ...c.heldAway.map((h) => `Your ${h.custodian} 403(b) rollover: asked about; comparison to follow.`),
    '',
    `Fees: ${clientMoney(c.fees.annual)} a year on ${clientMoney(c.fees.base)} (a blended ${clientRate(c.fees.blendedRate)}), from our tiered schedule.`,
    '',
    buildClientRateDisclosure(TAX_RATE_BASIS),
    `Prices as of ${fmtDayMonthYear(c.pricesAsOf)} close.`,
    '',
    advisor,
    FIRM_NAME,
  ].join('\n')
}
```

- [ ] **Step 5: The best-interest draft**

Create `src/mocks/workspace/best-interest.ts`:

```ts
import type { BestInterestAlternative, BestInterestDraft } from '@/types/workspace-prospect'
import type { ProspectVersionContent } from '@/mocks/agents/prospect-proposal-agent'
import { modelDisplayName } from '@/mocks/handlers/pms'
import { bandFor, lowerRiskBand } from '@/lib/risk-profile'
import { clientMoney, fmtWeight } from '@/kit/measure'
import { modelMix } from './prospect-model'

export const ROLLOVER_LINE = 'Rollover of the former employer 403(b): asked about; comparison to follow.'

/** Firm only: what the approval of this version will file, before the advisor's own rationale is added. */
export function bestInterestDraftOf(v: ProspectVersionContent): BestInterestDraft {
  const band = bandFor(v.score)
  const lower = lowerRiskBand(band)
  const stocks = (modelId: string) => `${fmtWeight(modelMix(modelId).stocks)}%`
  const alternatives: BestInterestAlternative[] = [
    ...(lower ? [{
      kind: 'lower_risk_model' as const, name: modelDisplayName(lower.modelId), annualFee: v.fees.annual,
      why: `Considered ${modelDisplayName(lower.modelId)}, the firm's model one band less risky (${stocks(lower.modelId)} in stocks against ${stocks(v.modelId)}). Her answers score ${v.score}, inside the ${band.label} band (${band.floor}–${band.ceiling}); the lower-risk model holds less in stocks than her answers support. The fee is the same.`,
    }] : []),
    {
      kind: 'self_directed', name: 'Staying self-directed', annualFee: 0,
      why: `Considered leaving her accounts where they are, with no advisory fee. She asked for advice on ${v.concentration ? `the ${v.concentration.name} concentration` : 'her holdings'} and on the 403(b), and for a managed model portfolio; the fee of ${clientMoney(v.fees.annual)} a year pays for that advice.`,
    },
  ]
  return {
    profileLabel: v.profileLabel, score: v.score, modelId: v.modelId, modelName: v.modelName, alternatives,
    costs: { scheduleName: v.fees.scheduleName, annualFee: v.fees.annual, blendedRate: v.fees.blendedRate },
    ...(v.concentration ? { concentration: { symbol: v.concentration.symbol, name: v.concentration.name, weightOfAssets: v.concentration.weightOfAssets, unrealised: v.concentration.unrealised, taxIfSoldNow: v.concentration.taxIfSoldNow } } : {}),
    rollover: ROLLOVER_LINE,
  }
}
```

- [ ] **Step 6: The proposal engine**

Create `src/mocks/workspace/prospect-proposals.ts`:

```ts
import type { AssetClass } from '@/types/portfolio'
import type {
  FeeEstimate, ProspectConstraint, ProspectProposal, ProspectProposalDetail, ProspectProposalVersion, ProspectRecord, Sleeve, Tranche, TransferLine, TransferSummary,
} from '@/types/workspace-prospect'
import { can } from '@/mocks/data/people'
import { nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { proposalTemplates, toFeeTiers } from '@/mocks/data/proposals'
import {
  clientSummaryOf, prospectChangeSummary, prospectDraftSummary, prospectProposalTitle, type ProspectVersionContent,
} from '@/mocks/agents/prospect-proposal-agent'
import { blendedTieredFee } from '@/lib/fees'
import { fingerprint } from '@/lib/fingerprint'
import { taxRateFor } from '@/lib/tax-rules'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { bestInterestDraftOf } from './best-interest'
import { modelWeights } from './prospect-model'
import { requireProspect, visibleProspect } from './prospects'
import { profileOf } from './risk-scoring'
import { cents, concentrationOf, transferSummary } from './transfer-in'
import { canSeeThread } from './visibility'

export type ProspectProposalFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type BuiltProspectVersion = ProspectVersionContent & { clientSummary: string; fingerprint: string }
const refuse = (status: ProspectProposalFailure['status'], code: string, message: string): ProspectProposalFailure => ({ ok: false, status, code, message })
const NO_PROPOSAL = refuse(404, 'NO_PROPOSAL', 'Proposal not found.')

export const FIRM_FEE_SCHEDULE_ID = 'tpl-001'

export const prospectProposalById = (id: string): ProspectProposal | undefined => store().prospectProposals.find((p) => p.id === id)

export function latestProspectVersion(proposal: ProspectProposal): ProspectProposalVersion {
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Prospect proposal ${proposal.id} has no versions`)
  return latest
}

export function visibleProspectProposal(viewerId: string, proposalId: string): ProspectProposal | undefined {
  const proposal = prospectProposalById(proposalId)
  return proposal && visibleProspect(viewerId, proposal.prospectId) ? proposal : undefined
}

export function prospectProposalDetail(proposal: ProspectProposal): ProspectProposalDetail {
  const record = requireProspect(proposal.prospectId)
  return {
    ...proposal,
    ...(record.sent?.proposalId === proposal.id ? { sent: record.sent } : {}),
    ...(record.accepted?.proposalId === proposal.id ? { accepted: record.accepted } : {}),
    bestInterestDraft: bestInterestDraftOf(latestProspectVersion(proposal)),
  }
}

function feesOn(base: number): FeeEstimate {
  const schedule = proposalTemplates.find((t) => t.id === FIRM_FEE_SCHEDULE_ID)
  if (!schedule) throw new Error(`The firm's fee schedule ${FIRM_FEE_SCHEDULE_ID} is missing`)
  const { fee, blendedRate } = blendedTieredFee(base, toFeeTiers(schedule.feeTiers))
  return { scheduleName: schedule.name, base, annual: cents(fee), blendedRate, tiers: schedule.feeTiers.map((t) => ({ label: t.label, rate: t.rate })) }
}

function sleevesOf(modelId: string, summary: TransferSummary): Sleeve[] {
  const target = modelWeights(modelId)
  const held = new Map<AssetClass, number>()
  for (const l of summary.lines) held.set(l.assetClass, (held.get(l.assetClass) ?? 0) + l.marketValue)
  held.set('cash', (held.get('cash') ?? 0) + summary.cash)
  return [...new Set([...target.keys(), ...held.keys()])].map((assetClass) => ({
    assetClass, target: target.get(assetClass) ?? 0, transferred: (held.get(assetClass) ?? 0) / summary.transferValue,
  }))
}

/** The concentrated holding sold in equal annual parts (the last takes any remainder), each with its basis share, gain and tax estimate. Nothing is sold. */
function tranchesOf(tranches: 2 | 3, line: TransferLine): Tranche[] {
  const year = Number(MOCK_TODAY_ISO.slice(0, 4))
  const each = Math.floor(line.quantity / tranches)
  const eachBasis = cents((line.costBasis * each) / line.quantity)
  return Array.from({ length: tranches }, (_, i) => {
    const last = i === tranches - 1
    const shares = last ? line.quantity - each * (tranches - 1) : each
    const basis = last ? cents(line.costBasis - eachBasis * (tranches - 1)) : eachBasis
    const proceeds = cents(shares * line.price)
    const gain = cents(proceeds - basis)
    return { n: i + 1, taxYear: year + i, shares, proceeds, gain, tax: gain > 0 ? cents(gain * taxRateFor(line.holdingPeriod)) : 0 }
  })
}

export function buildProspectVersion(record: ProspectRecord, constraints: readonly ProspectConstraint[]): { ok: true; built: BuiltProspectVersion } | ProspectProposalFailure {
  const profile = profileOf(record)
  if (!profile) return refuse(409, 'NO_QUESTIONNAIRE', 'Her questionnaire is not on file yet.')
  const summary = transferSummary(record)
  if (!summary) return refuse(409, 'NO_STATEMENTS', 'Her statements are not on file yet.')
  const concentration = concentrationOf(summary)
  const staged = constraints.find((c) => c.kind === 'stage_diversification')
  const line = concentration && summary.lines.find((l) => l.symbol === concentration.symbol)
  if (staged && !line) return refuse(400, 'NOTHING_TO_STAGE', 'She holds no concentrated position to stage.')
  const content: ProspectVersionContent = {
    constraints: [...constraints], score: profile.score, profileLabel: profile.profileLabel, modelId: profile.modelId, modelName: profile.modelName,
    transfer: summary.lines, cash: summary.cash, transferValue: summary.transferValue, totalAssets: summary.totalAssets,
    sleeves: sleevesOf(profile.modelId, summary), ...(concentration ? { concentration } : {}),
    tranches: staged && line ? tranchesOf(staged.tranches, line) : [], heldAway: summary.heldAway, fees: feesOn(summary.transferValue), pricesAsOf: summary.pricesAsOf,
  }
  const clientSummary = clientSummaryOf(record, content)
  const identity = [content.modelId, content.transfer.map((l) => [l.symbol, l.quantity, l.price, l.costBasis]), content.cash, content.tranches, content.fees.annual, clientSummary]
  return { ok: true, built: { ...content, clientSummary, fingerprint: fingerprint(JSON.stringify(identity)) } }
}

/** The internal thread where her proposal is drafted: the Proposal Agent on it, the viewer a member who may post. */
function draftingRefusal(viewerId: string, record: ProspectRecord): ProspectProposalFailure | undefined {
  const thread = store().threads.find((t) => t.id === record.internalThreadId)
  if (!thread || !canSeeThread(viewerId, thread)) return refuse(404, 'NO_THREAD', 'Thread not found.')
  if (!thread.agentIds.includes('proposal')) return refuse(403, 'NOT_ON_THREAD', 'The Proposal Agent is not on this thread.')
  if (!thread.memberIds.includes(viewerId) || !can(viewerId, 'post_firm')) return refuse(403, 'NOT_A_MEMBER', 'Only members of the thread can work on its proposal.')
  return undefined
}

function sentRefusal(proposal: ProspectProposal): ProspectProposalFailure | undefined {
  const sent = requireProspect(proposal.prospectId).sent
  return sent?.proposalId === proposal.id ? refuse(409, 'ALREADY_SENT', `v${sent.version} was sent to her (${sent.actId}); this proposal is closed.`) : undefined
}

export function createProspectProposal(viewerId: string, prospectId: string): { ok: true; detail: ProspectProposalDetail; created: boolean } | ProspectProposalFailure {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return refuse(404, 'NO_PROSPECT', 'Prospect not found.')
  const refused = draftingRefusal(viewerId, record)
  if (refused) return refused
  const existing = store().prospectProposals.find((p) => p.prospectId === record.id)
  if (existing) return { ok: true, detail: prospectProposalDetail(existing), created: false }
  const built = buildProspectVersion(record, [])
  if (!built.ok) return built
  const at = nextAt()
  const proposal: ProspectProposal = {
    id: `pprop-${pad(nextNumber('pproposal'))}`, prospectId: record.id, title: prospectProposalTitle(record), threadId: record.internalThreadId,
    versions: [{ n: 1, author: { kind: 'agent', agentId: 'proposal' }, createdAt: at, changeSummary: prospectDraftSummary(built.built), ...built.built }],
  }
  const s = store()
  s.prospectProposals.push(proposal)
  s.messages.push({ kind: 'prospect_proposal', id: nextId('msg'), threadId: record.internalThreadId, at, agentId: 'proposal', proposalId: proposal.id, title: proposal.title })
  return { ok: true, detail: prospectProposalDetail(proposal), created: true }
}

export function reviseProspectProposal(viewerId: string, proposalId: string, constraints: readonly ProspectConstraint[]): { ok: true; detail: ProspectProposalDetail } | ProspectProposalFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  const closed = sentRefusal(proposal)
  if (closed) return closed
  const record = requireProspect(proposal.prospectId)
  const refused = draftingRefusal(viewerId, record)
  if (refused) return refused
  const built = buildProspectVersion(record, constraints)
  if (!built.ok) return built
  const latest = latestProspectVersion(proposal)
  if (built.built.fingerprint === latest.fingerprint) return refuse(409, 'NO_CHANGE', `v${latest.n} already says that.`)
  const at = nextAt()
  const n = latest.n + 1
  const changeSummary = prospectChangeSummary(constraints, built.built)
  proposal.versions.push({ n, author: { kind: 'agent', agentId: 'proposal' }, createdAt: at, changeSummary, ...built.built })
  store().messages.push({ kind: 'prospect_proposal_version', id: nextId('msg'), threadId: proposal.threadId, at, proposalId: proposal.id, version: n, author: { kind: 'agent', agentId: 'proposal' }, changeSummary })
  return { ok: true, detail: prospectProposalDetail(proposal) }
}

/** What a revision would make, saved nowhere. Any firm viewer who can see the proposal may look. */
export function previewProspectRevision(viewerId: string, proposalId: string, constraints: readonly ProspectConstraint[]): { ok: true; preview: BuiltProspectVersion } | ProspectProposalFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  const built = buildProspectVersion(requireProspect(proposal.prospectId), constraints)
  return built.ok ? { ok: true, preview: built.built } : built
}

export function readableProspectProposals(viewerId: string, prospectId: string): ProspectProposalDetail[] | undefined {
  const record = visibleProspect(viewerId, prospectId)
  return record ? store().prospectProposals.filter((p) => p.prospectId === record.id).map(prospectProposalDetail) : undefined
}

export function parseProspectConstraints(value: unknown): { ok: true; value: ProspectConstraint[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: 'constraints must be a list.' }
  const parsed: ProspectConstraint[] = []
  for (const raw of value) {
    const tranches: unknown = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).tranches : undefined
    const kind: unknown = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).kind : undefined
    if (kind !== 'stage_diversification' || (tranches !== 2 && tranches !== 3)) return { ok: false, message: 'A revision may stage the concentrated sale in two or three tax years.' }
    parsed.push({ kind: 'stage_diversification', tranches })
  }
  if (parsed.length > 1) return { ok: false, message: 'Stage the sale once.' }
  return { ok: true, value: parsed }
}
```

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-proposals.test.ts src/kit/__tests__/measure.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(prospects): the prospect proposal — Growth from her profile, everything in kind, the tiered fee, a staged sale as a revision, what she will read

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 7: Approval with the best-interest record, and the send to her

Adrian approves one exact version (pinned to its fingerprint) with his rationale; the engine files the firm-only best-interest record with the act and opens the rollover follow-up task once. `send_to_party { proposalId }` sends the approved version's summary to her thread: refused before Form CRS, without an approval, with a newer version, or twice; ADV 2A, if not yet delivered, is delivered by the same act and its line precedes the proposal. Mark's correspondence review picks the message up.

**Files:**
- Create: `src/mocks/workspace/prospect-acts.ts`, `src/mocks/workspace/__tests__/prospect-acts.test.ts`

**Interfaces:**
- Consumes: `visibleProspectProposal`, `latestProspectVersion`, `bestInterestDraftOf` (Task 6); `recordDelivery`, `deliveryOf` (Task 4); `recordAct` (`proposal-acts.ts`); `advanceStage`, `requireProspect` (Task 3); `tradingDaysAfter`.
- Produces:

```ts
// src/mocks/workspace/prospect-acts.ts
export type ProspectActFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export const RATIONALE_MAX = 2000
export function approveProspectProposal(viewerId: string, proposalId: string, version: number, fingerprint: string, rationale: string): { ok: true; act: BindingAct } | ProspectActFailure
export function sendProspectProposal(viewerId: string, proposalId: string): { ok: true; act: BindingAct } | ProspectActFailure
```

- [ ] **Step 1: Write the failing test**

Create `src/mocks/workspace/__tests__/prospect-acts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { requireProspect } from '../prospects'
import { createProspectProposal, reviseProspectProposal } from '../prospect-proposals'
import { approveProspectProposal, sendProspectProposal } from '../prospect-acts'
import { deliverDisclosure } from '../disclosures'
import { sentMessages } from '../correspondence'
import { supervisionQueue } from '../supervision'
import { ADRIAN, withFormCrs, withHerReply } from './prospect-fixture'

const RATIONALE = 'Growth fits her answers and her long horizon; Stryker moves in kind and any sale is staged with her CPA.'
function drafted() {
  withHerReply()
  const r = createProspectProposal(ADRIAN, 'prsp-011')
  if (!r.ok) throw new Error(r.message)
  return r.detail
}
function approved(n = 1) {
  const detail = drafted()
  const v = detail.versions[n - 1]
  if (!v) throw new Error('no version')
  const r = approveProspectProposal(ADRIAN, detail.id, n, v.fingerprint, RATIONALE)
  if (!r.ok) throw new Error(r.message)
  return { detail, act: r.act }
}

describe('approving her proposal', () => {
  it('records the approval of one exact version with the firm-only best-interest record, in the internal thread', () => {
    const { detail, act } = approved()
    expect(act).toMatchObject({
      kind: 'approve_proposal', actorId: ADRIAN, threadId: 'th-pell-work', subject: { type: 'prospect_proposal', id: detail.id },
      version: 1, fingerprint: detail.versions[0]?.fingerprint, summary: 'Approved v1 of the Pell proposal, with the best-interest record',
      bestInterest: { rationale: RATIONALE, modelName: 'Growth', score: 66, rollover: 'Rollover of the former employer 403(b): asked about; comparison to follow.' },
    })
    expect(act.bestInterest?.alternatives.map((a) => a.kind)).toEqual(['lower_risk_model', 'self_directed'])
    expect(store().prospectProposals[0]?.approval).toEqual({ version: 1, fingerprint: detail.versions[0]?.fingerprint, actId: act.id, approverId: ADRIAN, at: act.at })
    expect(store().messages.filter((m) => m.threadId === 'th-pell-work').map((m) => m.kind)).toEqual(['prospect_proposal', 'act'])
  })

  it('opens the rollover follow-up once, owned by the approver, due five trading days after the approval day', () => {
    const { act } = approved()
    expect(requireProspect('prsp-011').tasks).toEqual([{ id: 'ptask-0001', text: 'Rollover of the former employer 403(b): asked about; comparison to follow. Prepare the comparison.',
      ownerId: ADRIAN, due: '2026-03-04', createdAt: act.at, fromActId: act.id }])
  })

  it('refuses content that moved, a blank or overlong rationale, a second approval of the same version; supersedes on another', () => {
    const detail = drafted()
    const v1 = detail.versions[0]
    if (!v1) throw new Error('no v1')
    expect(approveProspectProposal(ADRIAN, detail.id, 1, 'DEADBEEF', RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'FINGERPRINT_MISMATCH' })
    for (const bad of ['', '   ', 'x'.repeat(2001)]) expect(approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, bad)).toMatchObject({ ok: false, status: 400, code: 'BAD_RATIONALE' })
    expect(approveProspectProposal(ADRIAN, detail.id, 9, v1.fingerprint, RATIONALE)).toMatchObject({ ok: false, status: 404, code: 'NO_VERSION' })
    const first = approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)
    if (!first.ok) throw new Error(first.message)
    expect(approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)).toEqual({ ok: false, status: 409, code: 'ALREADY_APPROVED', message: `v1 is already approved (${first.act.id}).` })
    const revised = reviseProspectProposal(ADRIAN, detail.id, [{ kind: 'stage_diversification', tranches: 2 }])
    if (!revised.ok) throw new Error(revised.message)
    const v2 = revised.detail.versions[1]
    if (!v2) throw new Error('no v2')
    expect(approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)).toEqual({ ok: false, status: 409, code: 'NOT_LATEST', message: 'v2 is newer than v1; review v2 before approving.' })
    const second = approveProspectProposal(ADRIAN, detail.id, 2, v2.fingerprint, RATIONALE)
    expect(second.ok && second.act.summary).toBe('Approved v2 of the Pell proposal, with the best-interest record; the approval of v1 is withdrawn')
    expect(requireProspect('prsp-011').tasks).toHaveLength(1)
  })

  it('only the advisor approves; outsiders are told it does not exist', () => {
    const detail = drafted()
    const fp = detail.versions[0]?.fingerprint ?? ''
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(approveProspectProposal(viewer, detail.id, 1, fp, RATIONALE), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    for (const viewer of ['prsp-011', 'cli-001']) expect(approveProspectProposal(viewer, detail.id, 1, fp, RATIONALE), viewer).toMatchObject({ ok: false, status: 404 })
  })
})

describe('sending it to her', () => {
  it('is refused before Form CRS, and records nothing', () => {
    const { detail } = approved()
    const acts = store().acts.length
    expect(sendProspectProposal(ADRIAN, detail.id)).toEqual({ ok: false, status: 409, code: 'FORM_CRS_REQUIRED',
      message: 'Deliver Form CRS first: it comes before or with the first recommendation.' })
    expect(store().acts).toHaveLength(acts)
    expect(requireProspect('prsp-011').disclosures).toEqual([])
  })

  it('is refused without an approval, and when a newer version exists', () => {
    const detail = drafted()
    withFormCrs()
    expect(sendProspectProposal(ADRIAN, detail.id)).toMatchObject({ ok: false, status: 409, code: 'NOT_APPROVED' })
    const v1 = detail.versions[0]
    if (!v1) throw new Error('no v1')
    approveProspectProposal(ADRIAN, detail.id, 1, v1.fingerprint, RATIONALE)
    reviseProspectProposal(ADRIAN, detail.id, [{ kind: 'stage_diversification', tranches: 2 }])
    expect(sendProspectProposal(ADRIAN, detail.id)).toEqual({ ok: false, status: 409, code: 'NEWER_VERSION', message: 'v2 is newer than the approved v1; approve the version you mean to send.' })
  })

  it('sends the approved version with ADV 2A in the same act, the delivery line first, and closes the proposal', () => {
    const { detail } = approved()
    withFormCrs()
    const r = sendProspectProposal(ADRIAN, detail.id)
    if (!r.ok) throw new Error(r.message)
    const v1 = detail.versions[0]
    const text = store().messages.find((m) => m.kind === 'text' && m.id === r.act.messageId)
    expect(r.act).toMatchObject({
      kind: 'send_to_party', actorId: ADRIAN, threadId: 'th-pell', subject: { type: 'prospect_proposal', id: detail.id }, version: 1,
      basis: { proposalId: detail.id, version: 1, fingerprint: v1?.fingerprint }, delivers: ['adv_2a'],
      fingerprint: fingerprint(v1?.clientSummary ?? ''), summary: 'Sent v1 of the Pell proposal to Dr. Amanda Pell, with Form ADV Part 2A (firm brochure)',
    })
    expect(text).toMatchObject({ kind: 'text', threadId: 'th-pell', authorId: ADRIAN, body: v1?.clientSummary })
    const afterCrs = store().messages.filter((m) => m.threadId === 'th-pell' && m.id !== 'msg-s07').slice(2)
    expect(afterCrs.map((m) => m.kind)).toEqual(['disclosure_delivered', 'text', 'act'])
    expect(requireProspect('prsp-011')).toMatchObject({ stage: 'proposal', sent: { proposalId: detail.id, version: 1, actId: r.act.id, messageId: r.act.messageId } })
    expect(requireProspect('prsp-011').disclosures.map((d) => [d.document, d.actId])).toEqual([['form_crs', 'REC-0002'], ['adv_2a', r.act.id]])
    expect(sendProspectProposal(ADRIAN, detail.id)).toEqual({ ok: false, status: 409, code: 'ALREADY_SENT', message: `v1 was already sent to her (${r.act.id}).` })
    expect(approveProspectProposal(ADRIAN, detail.id, 1, v1?.fingerprint ?? '', RATIONALE)).toMatchObject({ ok: false, status: 409, code: 'ALREADY_SENT' })
  })

  it('delivers nothing more when ADV 2A went first; Mark finds the message in his correspondence queue', () => {
    const { detail } = approved()
    withFormCrs()
    deliverDisclosure(ADRIAN, 'prsp-011', 'adv_2a')
    const r = sendProspectProposal(ADRIAN, detail.id)
    if (!r.ok) throw new Error(r.message)
    expect(r.act.delivers).toBeUndefined()
    expect(r.act.summary).toBe('Sent v1 of the Pell proposal to Dr. Amanda Pell')
    expect(sentMessages().map((m) => m.message.id)).toContain(r.act.messageId)
    expect(supervisionQueue('cco-001')?.correspondence.map((c) => c.title)).toEqual(['Message to Dr. Amanda Pell'])
  })

  it('only the advisor sends', () => {
    const { detail } = approved()
    withFormCrs()
    expect(sendProspectProposal('user-002', detail.id)).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(sendProspectProposal('prsp-011', detail.id)).toMatchObject({ ok: false, status: 404 })
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-acts.test.ts --testTimeout 30000`
Expected: FAIL — `../prospect-acts` does not exist.

- [ ] **Step 3: Implement**

Create `src/mocks/workspace/prospect-acts.ts`:

```ts
import type { BindingAct, Message } from '@/types/workspace'
import type { ProspectProposal } from '@/types/workspace-prospect'
import { DISCLOSURE_TITLES } from '@/types/workspace-prospect'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, nextNumber, pad, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { tradingDaysAfter } from '@/lib/trading-calendar'
import { ROLLOVER_LINE, bestInterestDraftOf } from './best-interest'
import { deliveryOf, recordDelivery } from './disclosures'
import { recordAct } from './proposal-acts'
import { advanceStage, requireProspect } from './prospects'
import { latestProspectVersion, visibleProspectProposal } from './prospect-proposals'

export type ProspectActFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
type Recorded = { ok: true; act: BindingAct }
const refuse = (status: ProspectActFailure['status'], code: string, message: string): ProspectActFailure => ({ ok: false, status, code, message })
const NO_PROPOSAL = refuse(404, 'NO_PROPOSAL', 'Proposal not found.')

export const RATIONALE_MAX = 2000
const ROLLOVER_FOLLOW_UP_DAYS = 5

function sentRefusal(proposal: ProspectProposal): ProspectActFailure | undefined {
  const sent = requireProspect(proposal.prospectId).sent
  return sent?.proposalId === proposal.id ? refuse(409, 'ALREADY_SENT', `v${sent.version} was already sent to her (${sent.actId}).`) : undefined
}

export function approveProspectProposal(viewerId: string, proposalId: string, version: number, contentFingerprint: string, rationale: string): Recorded | ProspectActFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  if (!can(viewerId, 'approve_proposal')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor of record can approve a proposal.')
  const sent = sentRefusal(proposal)
  if (sent) return sent
  const v = proposal.versions.find((x) => x.n === version)
  if (!v) return refuse(404, 'NO_VERSION', `There is no v${version} of this proposal.`)
  const latest = latestProspectVersion(proposal)
  // Only the latest version can be sent, so only the latest is approved: a newer version means the reviewed one is no longer the proposal.
  if (version !== latest.n) return refuse(409, 'NOT_LATEST', `v${latest.n} is newer than v${version}; review v${latest.n} before approving.`)
  if (v.fingerprint !== contentFingerprint) return refuse(409, 'FINGERPRINT_MISMATCH', `v${version} is not the content you reviewed. Open it again before approving.`)
  const words = rationale.trim()
  if (words.length === 0 || words.length > RATIONALE_MAX) return refuse(400, 'BAD_RATIONALE', `Say why, in your own words, in 1 to ${RATIONALE_MAX} characters.`)
  const previous = proposal.approval
  if (previous?.version === version) return refuse(409, 'ALREADY_APPROVED', `v${version} is already approved (${previous.actId}).`)

  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'approve_proposal', actorId: viewerId, at, threadId: proposal.threadId,
    subject: { type: 'prospect_proposal', id: proposal.id }, version, fingerprint: v.fingerprint,
    bestInterest: { ...bestInterestDraftOf(v), rationale: words },
    summary: previous
      ? `Approved v${version} of the ${proposal.title}, with the best-interest record; the approval of v${previous.version} is withdrawn`
      : `Approved v${version} of the ${proposal.title}, with the best-interest record`,
  }
  proposal.approval = { version, fingerprint: v.fingerprint, actId: act.id, approverId: viewerId, at }
  const record = requireProspect(proposal.prospectId)
  if (record.tasks.length === 0) {
    record.tasks.push({
      id: `ptask-${pad(nextNumber('ptask'))}`, text: `${ROLLOVER_LINE} Prepare the comparison.`, ownerId: viewerId,
      due: tradingDaysAfter(at.slice(0, 10), ROLLOVER_FOLLOW_UP_DAYS), createdAt: at, fromActId: act.id,
    })
  }
  recordAct(act)
  return { ok: true, act }
}

export function sendProspectProposal(viewerId: string, proposalId: string): Recorded | ProspectActFailure {
  const proposal = visibleProspectProposal(viewerId, proposalId)
  if (!proposal) return NO_PROPOSAL
  if (!can(viewerId, 'send_to_party')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor of record can send to a client or prospect.')
  const sent = sentRefusal(proposal)
  if (sent) return sent
  const record = requireProspect(proposal.prospectId)
  if (!deliveryOf(record, 'form_crs')) return refuse(409, 'FORM_CRS_REQUIRED', 'Deliver Form CRS first: it comes before or with the first recommendation.')
  const approval = proposal.approval
  if (!approval) return refuse(409, 'NOT_APPROVED', 'Approve a version before sending it.')
  const latest = latestProspectVersion(proposal)
  if (latest.n !== approval.version) return refuse(409, 'NEWER_VERSION', `v${latest.n} is newer than the approved v${approval.version}; approve the version you mean to send.`)
  const v = proposal.versions.find((x) => x.n === approval.version)
  if (!v) throw new Error(`Approval ${approval.actId} names a missing version`)

  const withAdv2a = !deliveryOf(record, 'adv_2a')
  const at = nextAt()
  const text: Message = { kind: 'text', id: nextId('msg'), threadId: record.threadId, authorId: viewerId, at, body: v.clientSummary }
  const act: BindingAct = {
    id: commitActId(), kind: 'send_to_party', actorId: viewerId, at, threadId: record.threadId,
    subject: { type: 'prospect_proposal', id: proposal.id }, version: v.n, fingerprint: fingerprint(v.clientSummary), messageId: text.id,
    basis: { proposalId: proposal.id, version: v.n, fingerprint: v.fingerprint },
    ...(withAdv2a ? { delivers: ['adv_2a' as const] } : {}),
    summary: `Sent v${v.n} of the ${proposal.title} to ${record.name}${withAdv2a ? `, with ${DISCLOSURE_TITLES.adv_2a}` : ''}`,
  }
  // ADV 2A at or before the proposal: its line is posted first, at the act's own time.
  if (withAdv2a) recordDelivery(record, 'adv_2a', act.id, viewerId, at)
  store().messages.push(text)
  recordAct(act)
  record.sent = { proposalId: proposal.id, version: v.n, actId: act.id, messageId: text.id, at }
  advanceStage(record, 'proposal', at)
  return { ok: true, act }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-acts.test.ts --testTimeout 30000`
Expected: PASS. The test's `'REC-0002'` for Form CRS assumes the approval took `REC-0001`; if the order of setup changes, read the id from `withFormCrs`'s act instead.

- [ ] **Step 5: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add src/mocks/workspace/prospect-acts.ts src/mocks/workspace/__tests__/prospect-acts.test.ts
git commit -m "feat(prospects): approve with the best-interest record; send to her with ADV 2A, never before Form CRS

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 8: The coffee, her steps, the clock jumps, her acceptance and the onboarding it opens

Her side of the story, performed three ways and recorded as her each time: scripted on the labelled clock jumps ("Advance to her reply · Thu 26 Feb 09:10 ET", "Advance to her acceptance · Mon 2 Mar 10:00 ET"), through the presenter's "Demo · act as Dr. Pell", or by the presenter viewing as her — every step marked with the firm-only `viaPresenter` and its path. The coffee comes first (its note moves the clock to the coffee's end). Her acceptance opens onboarding once, with owners and trading-day dues counted from the acceptance day. The jumps move the clock forward only; the engine's day stays 25 Feb, so a release after a jump is refused.

**Files:**
- Create: `src/mocks/workspace/prospect-steps.ts`, `src/mocks/workspace/__tests__/prospect-steps.test.ts`
- Modify: `src/mocks/workspace/compliance-acts.ts:77-81` (`sessionSequences`: fills only on the frozen trading day)

**Interfaces:**
- Consumes: `recordAct`; `visibleProspect`, `prospectOf`, `advanceStage` (Task 3); `scoreAnswers` (Task 5); `prospectProposalById` (Task 6); `PELL_*`, `REPLY_AT`, `ACCEPTANCE_AT` (Task 3); `advanceClockTo`, `nextAt`; `tradingDaysAfter`; `calendarEvents`.
- Produces:

```ts
// src/mocks/workspace/prospect-steps.ts
export type StepFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type StepDone = { ok: true; steps: PartySteps; act?: BindingAct }
export type StepInput = { answers?: readonly RiskAnswer[]; version?: number }
export const COFFEE_NOTE_MAX = 2000
export function recordCoffee(viewerId: string, prospectId: string, body: string): { ok: true; message: Message } | StepFailure
export function herStep(viewerId: string, prospectId: string, step: ProspectStepName, input?: StepInput): StepDone | StepFailure
export function actAsProspect(presenterId: string, prospectId: string, step: ProspectStepName): StepDone | StepFailure
export function advanceProspect(viewerId: string, prospectId: string, to: 'reply' | 'acceptance'): StepDone | StepFailure
export function partyStepsOf(record: ProspectRecord): PartySteps
export function partySteps(viewerId: string, prospectId: string): PartySteps | undefined     // her, or a firm viewer who may read her
export function nextJumpOf(record: ProspectRecord): NextJump | undefined
```

- [ ] **Step 1: Write the failing test**

Create `src/mocks/workspace/__tests__/prospect-steps.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { advanceClockTo, sessionNow, store } from '@/mocks/data/workspace-store'
import { PELL_REPLY, PELL_ACCEPTANCE } from '@/mocks/data/prospect-script'
import { eventTime } from '@/lib/clock'
import { requireProspect } from '../prospects'
import { createProspectProposal } from '../prospect-proposals'
import { approveProspectProposal, sendProspectProposal } from '../prospect-acts'
import { deliverDisclosure, deliverableNow } from '../disclosures'
import { transferSummary } from '../transfer-in'
import { createProposal } from '../proposals'
import { approveProposal } from '../proposal-acts'
import { releaseOrders } from '../compliance-acts'
import { actAsProspect, advanceProspect, herStep, nextJumpOf, partySteps, recordCoffee } from '../prospect-steps'
import { ADRIAN } from './prospect-fixture'

const PELL = 'prsp-011'
const SCRIPTED = { presenterId: ADRIAN, path: 'scripted' }
const herThread = () => store().messages.filter((m) => m.threadId === 'th-pell' && m.id !== 'msg-s07')
function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r as Extract<T, { ok: true }>
}
const coffee = () => ok(recordCoffee(ADRIAN, PELL, 'Coffee after James Thompson\'s introduction. She asked about the old 403(b); a comparison will follow.'))

/** Coffee, reply, v1 drafted and approved, Form CRS, sent: everything her acceptance waits for. */
function sentToHer() {
  coffee()
  ok(advanceProspect(ADRIAN, PELL, 'reply'))
  const detail = ok(createProspectProposal(ADRIAN, PELL)).detail
  ok(approveProspectProposal(ADRIAN, detail.id, 1, detail.versions[0]?.fingerprint ?? '', 'Growth fits her answers.'))
  ok(deliverDisclosure(ADRIAN, PELL, 'form_crs'))
  ok(sendProspectProposal(ADRIAN, detail.id))
  return detail
}

describe('the coffee', () => {
  it('moves the clock to its end and posts a labelled note in the internal thread, once', () => {
    const note = coffee()
    expect(note).toMatchObject({ kind: 'prospect_note', threadId: 'th-pell-work', at: '2026-02-25T21:30:00.000Z', authorId: ADRIAN, eventId: 'evt-004',
      title: 'Coffee with Dr. Amanda Pell', start: '2026-02-25T20:30:00.000Z', end: '2026-02-25T21:30:00.000Z' })
    expect(requireProspect(PELL).coffee).toEqual({ at: note.at, messageId: note.id, authorId: ADRIAN })
    expect(recordCoffee(ADRIAN, PELL, 'Again.')).toEqual({ ok: false, status: 409, code: 'ALREADY_RECORDED', message: `The coffee was already recorded (${note.id}).` })
  })

  it('is the advisor\'s, written in 1 to 2,000 characters; it never moves the clock back', () => {
    expect(recordCoffee('user-002', PELL, 'Note.')).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(recordCoffee(PELL, PELL, 'Note.')).toMatchObject({ ok: false, status: 404 })
    expect(recordCoffee(ADRIAN, PELL, '   ')).toMatchObject({ ok: false, status: 400, code: 'BAD_NOTE' })
    advanceClockTo(2000)
    expect(coffee().at).toBe(eventTime(2001))
  })
})

describe('her reply, on the clock jump', () => {
  it('waits for the coffee, and moves nothing while it waits', () => {
    const before = sessionNow()
    expect(advanceProspect(ADRIAN, PELL, 'reply')).toEqual({ ok: false, status: 409, code: 'COFFEE_FIRST', message: 'Record the coffee first; her reply follows it.' })
    expect(sessionNow()).toBe(before)
  })

  it('arrives Thu 26 Feb 09:10 ET: her message, her answers, her statements — recorded as her, scripted', () => {
    coffee()
    const r = ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(herThread().map((m) => [m.kind, m.at, m.kind === 'text' || m.kind === 'party_step' ? m.authorId : ''])).toEqual([
      ['text', '2026-02-26T14:10:00.000Z', PELL], ['party_step', '2026-02-26T14:11:00.000Z', PELL], ['party_step', '2026-02-26T14:12:00.000Z', PELL],
    ])
    expect(herThread()[0]).toMatchObject({ body: PELL_REPLY })
    expect(herThread().map((m) => (m.kind === 'party_step' ? m.summary : ''))).toEqual(['', 'Answered the risk questionnaire.', 'Shared two statements: Fidelity taxable brokerage and TIAA 403(b).'])
    const record = requireProspect(PELL)
    expect(record.steps.map((s) => [s.kind, s.viaPresenter])).toEqual([['questionnaire', SCRIPTED], ['statements', SCRIPTED]])
    expect(record.stage).toBe('discovery')
    expect(r.steps).toEqual({ questionnaire: 'done', statements: 'done', acceptance: 'unavailable' })
    const after = sessionNow()
    expect(advanceProspect(ADRIAN, PELL, 'reply')).toEqual({ ok: false, status: 409, code: 'ALREADY_REPLIED', message: 'Her reply is already on file.' })
    expect(sessionNow()).toBe(after)
  })

  it('keeps the engine\'s day: her holdings are still valued at the 25 Feb close', () => {
    coffee()
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(transferSummary(requireProspect(PELL))).toMatchObject({ pricesAsOf: '2026-02-25', transferValue: 2_100_000 })
  })

  it('leaves the Johnson orders unreleasable: fills belong to the 25 Feb session', () => {
    const proposal = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).detail
    const fp = proposal.versions[0]?.fingerprint ?? ''
    const approval = ok(approveProposal(ADRIAN, proposal.id, 1, fp)).act
    coffee()
    expect(releaseOrders('cco-001', proposal.id, approval.id, fp, 'Reviewed.')).toMatchObject({ ok: false, status: 409, code: 'MARKET_CLOSED' })
  })
})

describe('her steps through the shortcut and through View as', () => {
  it('the shortcut records her answers as her, marked shortcut; the jump then brings only her statements', () => {
    coffee()
    const r = ok(actAsProspect(ADRIAN, PELL, 'questionnaire'))
    expect(r.steps.questionnaire).toBe('done')
    expect(requireProspect(PELL).steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'shortcut' })
    expect(actAsProspect(ADRIAN, PELL, 'questionnaire')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ANSWERED' })
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(requireProspect(PELL).steps.map((s) => [s.kind, s.viaPresenter.path])).toEqual([['questionnaire', 'shortcut'], ['statements', 'scripted']])
  })

  it('as herself she takes her own steps, marked view_as; the firm is told the step is hers; Robert is told she does not exist', () => {
    coffee()
    ok(herStep(PELL, PELL, 'statements'))
    expect(requireProspect(PELL).steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'view_as' })
    expect(herStep(ADRIAN, PELL, 'questionnaire')).toEqual({ ok: false, status: 403, code: 'NOT_HER_STEP', message: 'This step is hers; the presenter uses "Demo · act as Dr. Pell".' })
    expect(herStep('cli-001', PELL, 'questionnaire')).toMatchObject({ ok: false, status: 404 })
  })

  it('refuses answers that do not score, and every step before the coffee', () => {
    expect(herStep(PELL, PELL, 'questionnaire')).toEqual({ ok: false, status: 409, code: 'COFFEE_FIRST', message: 'Record the coffee first; her reply follows it.' })
    coffee()
    expect(herStep(PELL, PELL, 'questionnaire', { answers: [{ questionId: 'rq-01', selectedOption: 0 }] })).toEqual({ ok: false, status: 400, code: 'BAD_ANSWERS', message: 'Answer every question once.' })
    expect(requireProspect(PELL).questionnaire).toBeUndefined()
  })

  it('only the presenter acts as her and moves the clock', () => {
    coffee()
    for (const viewer of ['user-002', 'user-003', 'cco-001']) {
      expect(actAsProspect(viewer, PELL, 'questionnaire'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
      expect(advanceProspect(viewer, PELL, 'reply'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    }
    for (const viewer of [PELL, 'cli-001']) {
      expect(actAsProspect(viewer, PELL, 'questionnaire'), viewer).toMatchObject({ ok: false, status: 404 })
      expect(advanceProspect(viewer, PELL, 'reply'), viewer).toMatchObject({ ok: false, status: 404 })
    }
  })
})

describe('her acceptance', () => {
  it('waits for a proposal sent to her', () => {
    coffee()
    expect(advanceProspect(ADRIAN, PELL, 'acceptance')).toEqual({ ok: false, status: 409, code: 'NOT_SENT', message: 'Nothing has been sent to her to accept.' })
    expect(herStep(PELL, PELL, 'accept')).toMatchObject({ ok: false, status: 409, code: 'NOT_SENT' })
  })

  it('arrives Mon 2 Mar 10:00 ET, recorded as her, and opens onboarding once with trading-day dues from that day', () => {
    const detail = sentToHer()
    expect(herStep(PELL, PELL, 'accept', { version: 2 })).toEqual({ ok: false, status: 409, code: 'NOT_THE_SENT_VERSION', message: 'v1 is the version sent to her.' })
    const r = ok(advanceProspect(ADRIAN, PELL, 'acceptance'))
    expect(herThread().filter((m) => m.at.startsWith('2026-03-02')).map((m) => [m.kind, m.at])).toEqual([
      ['text', '2026-03-02T15:00:00.000Z'], ['act', '2026-03-02T15:02:00.000Z'],
    ])
    expect(herThread().find((m) => m.kind === 'text' && m.at === '2026-03-02T15:00:00.000Z')).toMatchObject({ authorId: PELL, body: PELL_ACCEPTANCE })
    expect(r.act).toMatchObject({ kind: 'accept_proposal', actorId: PELL, at: '2026-03-02T15:01:00.000Z', threadId: 'th-pell', version: 1,
      subject: { type: 'prospect_proposal', id: detail.id }, viaPresenter: SCRIPTED, summary: 'Dr. Amanda Pell accepted v1 of the Pell proposal' })
    const record = requireProspect(PELL)
    expect(record.stage).toBe('onboarding')
    expect(record.stageHistory.map((h) => h.stage)).toEqual(['contact', 'discovery', 'proposal', 'accepted', 'onboarding'])
    expect(record.onboarding?.items.map((i) => [i.id, i.status, i.ownerId, i.due])).toEqual([
      ['account_application', 'open', 'user-002', '2026-03-04'], ['cip', 'open', 'user-002', '2026-03-04'], ['ofac', 'open', 'user-002', '2026-03-03'],
      ['trusted_contact', 'open', 'user-002', '2026-03-05'], ['source_of_funds', 'open', ADRIAN, '2026-03-05'],
      ['advisory_agreement', 'awaiting_signature', ADRIAN, '2026-03-09'], ['adv_2b', 'open', ADRIAN, '2026-03-03'], ['privacy_notice', 'open', ADRIAN, '2026-03-03'],
      ['acat', 'not_started', 'user-002', undefined],
    ])
    expect(store().messages.filter((m) => m.kind === 'onboarding_opened')).toHaveLength(1)
    expect(advanceProspect(ADRIAN, PELL, 'acceptance')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ACCEPTED' })
    expect(herStep(PELL, PELL, 'accept')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_ACCEPTED' })
    expect(store().messages.filter((m) => m.kind === 'onboarding_opened')).toHaveLength(1)
    expect(deliverableNow(record)).toEqual(['adv_2b', 'privacy_notice'])
  })

  it('leaves the Johnson orders unreleasable on Monday too: the session open then is not the frozen day\'s', () => {
    const proposal = ok(createProposal(ADRIAN, 'th-johnson-review', 'acc-002')).detail
    const fp = proposal.versions[0]?.fingerprint ?? ''
    const approval = ok(approveProposal(ADRIAN, proposal.id, 1, fp)).act
    sentToHer()
    ok(advanceProspect(ADRIAN, PELL, 'acceptance'))
    expect(releaseOrders('cco-001', proposal.id, approval.id, fp, 'Reviewed.')).toMatchObject({ ok: false, status: 409, code: 'MARKET_CLOSED' })
  })
})

describe('what her steps read', () => {
  it('she and the firm read her steps; Robert does not; the next jump says what it waits for', () => {
    expect(partySteps(PELL, PELL)).toEqual({ questionnaire: 'unavailable', statements: 'unavailable', acceptance: 'unavailable' })
    expect(partySteps('cli-001', PELL)).toBeUndefined()
    expect(nextJumpOf(requireProspect(PELL))).toEqual({ to: 'reply', at: '2026-02-26T14:10:00.000Z', blockedReason: 'Record the coffee first; her reply follows it.' })
    coffee()
    expect(partySteps(ADRIAN, PELL)).toEqual({ questionnaire: 'open', statements: 'open', acceptance: 'unavailable' })
    expect(nextJumpOf(requireProspect(PELL))).toEqual({ to: 'reply', at: '2026-02-26T14:10:00.000Z' })
    ok(advanceProspect(ADRIAN, PELL, 'reply'))
    expect(nextJumpOf(requireProspect(PELL))).toEqual({ to: 'acceptance', at: '2026-03-02T15:00:00.000Z', blockedReason: 'Send her the proposal first; her acceptance follows it.' })
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-steps.test.ts --testTimeout 30000`
Expected: FAIL — `../prospect-steps` does not exist.

- [ ] **Step 3: Fills belong to the frozen day**

In `src/mocks/workspace/compliance-acts.ts` `sessionSequences` (lines 77–81), the last line becomes:

```ts
  // Fills are priced at the frozen day's close: a session on any later day (after a clock jump) is out of scope.
  return sequences.every((n) => eventTime(n).slice(0, 10) === MOCK_TODAY_ISO && isDuringNyseSession(eventTime(n))) ? sequences : undefined
```

- [ ] **Step 4: Her steps, the coffee and the jumps**

Create `src/mocks/workspace/prospect-steps.ts`:

```ts
import type { RiskAnswer } from '@/types/onboarding'
import type { BindingAct, Message, ViaPresenter } from '@/types/workspace'
import type { NextJump, OnboardingItem, PartySteps, ProspectRecord, ProspectStepName, StepState } from '@/types/workspace-prospect'
import { calendarEvents } from '@/mocks/data/calendar'
import { PRESENTER_ID, can } from '@/mocks/data/people'
import { advanceClockTo, commitActId, nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { ACCEPTANCE_AT, PELL_ACCEPTANCE, PELL_ANSWERS, PELL_REPLY, PELL_STATEMENTS, REPLY_AT } from '@/mocks/data/prospect-script'
import { PELL_ID } from '@/mocks/data/prospect-seed'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { tradingDaysAfter } from '@/lib/trading-calendar'
import { joinWords } from '@/lib/words'
import { recordAct } from './proposal-acts'
import { advanceStage, prospectOf, visibleProspect } from './prospects'
import { prospectProposalById } from './prospect-proposals'
import { scoreAnswers } from './risk-scoring'
import { isFirmViewer } from './visibility'

export type StepFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type StepDone = { ok: true; steps: PartySteps; act?: BindingAct }
export type StepInput = { answers?: readonly RiskAnswer[]; version?: number }
type Performed = { ok: true; act?: BindingAct } | StepFailure

const refuse = (status: StepFailure['status'], code: string, message: string): StepFailure => ({ ok: false, status, code, message })
const NO_PROSPECT = refuse(404, 'NO_PROSPECT', 'Prospect not found.')
const COFFEE_FIRST = refuse(409, 'COFFEE_FIRST', 'Record the coffee first; her reply follows it.')
export const COFFEE_NOTE_MAX = 2000

const minuteOf = (iso: string) => Math.round((Date.parse(iso) - Date.parse(MOCK_NOW_ISO)) / 60_000)
/** The next event is recorded at `iso`, or later if the session clock has already passed it. The clock never runs backwards. */
const jumpTo = (iso: string) => advanceClockTo(minuteOf(iso) - 1)

/** Her scripted content. Only Dr. Pell has a script; any other prospect is a fixture error. */
function scriptOf(record: ProspectRecord) {
  if (record.id !== PELL_ID) throw new Error(`No script for prospect ${record.id}`)
  return { answers: PELL_ANSWERS, statements: PELL_STATEMENTS, reply: PELL_REPLY, acceptance: PELL_ACCEPTANCE }
}

/** Her onboarding, in the order the firm works it; dues are trading days after the acceptance day. */
const ONBOARDING_PLAN: readonly (Omit<OnboardingItem, 'due'> & { dueIn?: number })[] = [
  { id: 'account_application', label: 'Individual taxable account application', status: 'open', ownerId: 'user-002', dueIn: 2 },
  { id: 'cip', label: 'CIP identity verification', status: 'open', ownerId: 'user-002', dueIn: 2 },
  { id: 'ofac', label: 'OFAC screen', status: 'open', ownerId: 'user-002', dueIn: 1 },
  { id: 'trusted_contact', label: 'Trusted contact (FINRA Rule 4512)', status: 'open', ownerId: 'user-002', dueIn: 3 },
  { id: 'source_of_funds', label: 'Source of funds', status: 'open', ownerId: 'user-001', dueIn: 3 },
  { id: 'advisory_agreement', label: 'Advisory agreement', status: 'awaiting_signature', ownerId: 'user-001', dueIn: 5 },
  { id: 'adv_2b', label: 'Form ADV Part 2B — deliver; receipt signed with the agreement', status: 'open', ownerId: 'user-001', dueIn: 1 },
  { id: 'privacy_notice', label: 'Privacy notice — deliver', status: 'open', ownerId: 'user-001', dueIn: 1 },
  { id: 'acat', label: 'ACAT transfer', status: 'not_started', ownerId: 'user-002' },
]

function postParty(record: ProspectRecord, step: 'questionnaire' | 'statements', summary: string, at: string): Message {
  const message: Message = { kind: 'party_step', id: nextId('msg'), threadId: record.threadId, at, authorId: record.id, step, summary }
  store().messages.push(message)
  return message
}

function postHerText(record: ProspectRecord, body: string): void {
  store().messages.push({ kind: 'text', id: nextId('msg'), threadId: record.threadId, authorId: record.id, at: nextAt(), body })
}

function answer(record: ProspectRecord, via: ViaPresenter, answers: readonly RiskAnswer[]): Performed {
  if (!record.coffee) return COFFEE_FIRST
  if (record.questionnaire) return refuse(409, 'ALREADY_ANSWERED', `She answered the questionnaire at ${record.questionnaire.receivedAt}.`)
  const scored = scoreAnswers(answers)
  if (!scored.ok) return refuse(400, 'BAD_ANSWERS', scored.message)
  const at = nextAt()
  const message = postParty(record, 'questionnaire', 'Answered the risk questionnaire.', at)
  record.questionnaire = { answers: answers.map((a) => ({ ...a })), receivedAt: at }
  record.steps.push({ kind: 'questionnaire', at, messageId: message.id, viaPresenter: via })
  advanceStage(record, 'discovery', at)
  return { ok: true }
}

function share(record: ProspectRecord, via: ViaPresenter): Performed {
  if (!record.coffee) return COFFEE_FIRST
  if (record.statements.length > 0) return refuse(409, 'ALREADY_SHARED', 'She already shared her statements.')
  const statements = scriptOf(record).statements.map((s) => ({ ...s, holdings: s.holdings.map((h) => ({ ...h })) }))
  const at = nextAt()
  const named = statements.map((s) => `${s.custodian} ${s.accountType === '403b' ? '403(b)' : 'taxable brokerage'}`)
  const count = statements.length === 2 ? 'two' : String(statements.length)
  const message = postParty(record, 'statements', `Shared ${count} statements: ${joinWords(named)}.`, at)
  record.statements = statements
  record.steps.push({ kind: 'statements', at, messageId: message.id, viaPresenter: via })
  advanceStage(record, 'discovery', at)
  return { ok: true }
}

function openOnboarding(record: ProspectRecord, acceptance: BindingAct): void {
  if (record.onboarding) return
  const day = acceptance.at.slice(0, 10)
  const items: OnboardingItem[] = ONBOARDING_PLAN.map(({ dueIn, ...item }) => ({ ...item, ...(dueIn === undefined ? {} : { due: tradingDaysAfter(day, dueIn) }) }))
  record.onboarding = { openedAt: acceptance.at, acceptanceActId: acceptance.id, items }
  store().messages.push({ kind: 'onboarding_opened', id: nextId('msg'), threadId: record.internalThreadId, at: nextAt(), prospectId: record.id,
    acceptanceActId: acceptance.id, items: items.map((i) => ({ ...i })) })
}

function accept(record: ProspectRecord, via: ViaPresenter, version: number | undefined): Performed {
  const sent = record.sent
  if (!sent) return refuse(409, 'NOT_SENT', 'Nothing has been sent to her to accept.')
  if (record.accepted) return refuse(409, 'ALREADY_ACCEPTED', `She already accepted v${record.accepted.version} (${record.accepted.actId}).`)
  if (version !== undefined && version !== sent.version) return refuse(409, 'NOT_THE_SENT_VERSION', `v${sent.version} is the version sent to her.`)
  const proposal = prospectProposalById(sent.proposalId)
  const v = proposal?.versions.find((x) => x.n === sent.version)
  if (!proposal || !v) throw new Error(`The sent record ${sent.actId} names a missing proposal version`)
  const at = nextAt()
  const act: BindingAct = {
    id: commitActId(), kind: 'accept_proposal', actorId: record.id, at, threadId: record.threadId,
    subject: { type: 'prospect_proposal', id: proposal.id }, version: v.n, fingerprint: v.fingerprint,
    summary: `${record.name} accepted v${v.n} of the ${proposal.title}`, viaPresenter: via,
  }
  recordAct(act)
  const marker = store().messages.find((m) => m.kind === 'act' && m.actId === act.id)
  if (!marker) throw new Error(`The acceptance ${act.id} has no slip`)
  record.accepted = { proposalId: proposal.id, version: v.n, actId: act.id, at }
  record.steps.push({ kind: 'acceptance', at, messageId: marker.id, actId: act.id, viaPresenter: via })
  advanceStage(record, 'accepted', at)
  advanceStage(record, 'onboarding', at)
  openOnboarding(record, act)
  return { ok: true, act }
}

function perform(record: ProspectRecord, step: ProspectStepName, via: ViaPresenter, input: StepInput): Performed {
  switch (step) {
    case 'questionnaire': return answer(record, via, input.answers ?? scriptOf(record).answers)
    case 'statements': return share(record, via)
    case 'accept': return accept(record, via, input.version)
  }
}

const done = (record: ProspectRecord, performed: Performed): StepDone | StepFailure =>
  performed.ok ? { ok: true, steps: partyStepsOf(record), ...(performed.act ? { act: performed.act } : {}) } : performed

export function recordCoffee(viewerId: string, prospectId: string, body: string): { ok: true; message: Message } | StepFailure {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return NO_PROSPECT
  if (!can(viewerId, 'prepare_meeting')) return refuse(403, 'NOT_PERMITTED', 'Only the advisor records the coffee.')
  if (record.coffee) return refuse(409, 'ALREADY_RECORDED', `The coffee was already recorded (${record.coffee.messageId}).`)
  const text = body.trim()
  if (text.length === 0 || text.length > COFFEE_NOTE_MAX) return refuse(400, 'BAD_NOTE', `Write the note in 1 to ${COFFEE_NOTE_MAX} characters.`)
  const event = calendarEvents.find((e) => e.id === record.eventId)
  if (!event) throw new Error(`Prospect ${record.id} names a missing event ${record.eventId}`)
  const start = new Date(event.startTime).toISOString()
  const end = new Date(event.endTime).toISOString()
  jumpTo(end)
  const at = nextAt()
  const message: Message = { kind: 'prospect_note', id: nextId('msg'), threadId: record.internalThreadId, at, authorId: viewerId, prospectId: record.id,
    eventId: record.eventId, title: `Coffee with ${record.name}`, start, end, body: text }
  store().messages.push(message)
  record.coffee = { at, messageId: message.id, authorId: viewerId }
  return { ok: true, message }
}

/** A step she takes herself (the presenter viewing as her). The firm is told the step is hers; anyone else, that she does not exist. */
export function herStep(viewerId: string, prospectId: string, step: ProspectStepName, input: StepInput = {}): StepDone | StepFailure {
  const record = prospectOf(prospectId)
  if (record && viewerId === record.id) return done(record, perform(record, step, { presenterId: PRESENTER_ID, path: 'view_as' }, input))
  if (record && visibleProspect(viewerId, prospectId)) return refuse(403, 'NOT_HER_STEP', `This step is hers; the presenter uses "Demo · act as ${record.salutation}".`)
  return NO_PROSPECT
}

/** "Demo · act as Dr. Pell": her scripted step, recorded as her with the shortcut marked. Only the presenter. */
export function actAsProspect(presenterId: string, prospectId: string, step: ProspectStepName): StepDone | StepFailure {
  if (!isFirmViewer(presenterId)) return NO_PROSPECT
  if (presenterId !== PRESENTER_ID) return refuse(403, 'NOT_PERMITTED', 'Only the presenter can act as the prospect.')
  const record = visibleProspect(presenterId, prospectId)
  if (!record) return NO_PROSPECT
  return done(record, perform(record, step, { presenterId, path: 'shortcut' }, {}))
}

/** The labelled clock jumps: her reply (Thu 26 Feb 09:10 ET) and her acceptance (Mon 2 Mar 10:00 ET). Only the presenter. */
export function advanceProspect(viewerId: string, prospectId: string, to: 'reply' | 'acceptance'): StepDone | StepFailure {
  if (!isFirmViewer(viewerId)) return NO_PROSPECT
  if (viewerId !== PRESENTER_ID) return refuse(403, 'NOT_PERMITTED', 'Only the presenter moves the clock.')
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return NO_PROSPECT
  const via: ViaPresenter = { presenterId: viewerId, path: 'scripted' }
  const script = scriptOf(record)
  if (to === 'reply') {
    if (!record.coffee) return COFFEE_FIRST
    if (record.questionnaire && record.statements.length > 0) return refuse(409, 'ALREADY_REPLIED', 'Her reply is already on file.')
    jumpTo(REPLY_AT)
    postHerText(record, script.reply)
    for (const step of ['questionnaire', 'statements'] as const) {
      const pending = step === 'questionnaire' ? !record.questionnaire : record.statements.length === 0
      if (!pending) continue
      const r = perform(record, step, via, {})
      if (!r.ok) throw new Error(`Her scripted ${step} was refused after the jump: ${r.message}`)
    }
    return done(record, { ok: true })
  }
  if (!record.sent) return refuse(409, 'NOT_SENT', 'Nothing has been sent to her to accept.')
  if (record.accepted) return refuse(409, 'ALREADY_ACCEPTED', `She already accepted v${record.accepted.version} (${record.accepted.actId}).`)
  jumpTo(ACCEPTANCE_AT)
  postHerText(record, script.acceptance)
  const r = perform(record, 'accept', via, {})
  if (!r.ok) throw new Error(`Her scripted acceptance was refused after the jump: ${r.message}`)
  return done(record, r)
}

export function partyStepsOf(record: ProspectRecord): PartySteps {
  const replyStep = (isDone: boolean): StepState => (isDone ? 'done' : record.coffee ? 'open' : 'unavailable')
  return {
    questionnaire: replyStep(record.questionnaire !== undefined), statements: replyStep(record.statements.length > 0),
    acceptance: record.accepted ? 'done' : record.sent ? 'open' : 'unavailable',
    ...(record.sent ? { sentVersion: record.sent.version } : {}),
  }
}

export function partySteps(viewerId: string, prospectId: string): PartySteps | undefined {
  const record = prospectOf(prospectId)
  return record && (viewerId === record.id || visibleProspect(viewerId, prospectId)) ? partyStepsOf(record) : undefined
}

export function nextJumpOf(record: ProspectRecord): NextJump | undefined {
  if (!record.questionnaire || record.statements.length === 0) {
    return { to: 'reply', at: REPLY_AT, ...(record.coffee ? {} : { blockedReason: 'Record the coffee first; her reply follows it.' }) }
  }
  if (record.accepted) return undefined
  return { to: 'acceptance', at: ACCEPTANCE_AT, ...(record.sent ? {} : { blockedReason: 'Send her the proposal first; her acceptance follows it.' }) }
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-steps.test.ts src/mocks/workspace/__tests__/fills.test.ts src/mocks/workspace/__tests__/orders-acts.test.ts --testTimeout 30000`
Expected: PASS (the release suites still fill inside the frozen day's session).

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add src/mocks/workspace/prospect-steps.ts src/mocks/workspace/compliance-acts.ts src/mocks/workspace/__tests__/prospect-steps.test.ts
git commit -m "feat(prospects): the coffee, her steps three ways, the forward-only clock jumps, her acceptance and the onboarding it opens

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 9: HTTP endpoints, client functions and hooks

The prospect read model and every write over HTTP, viewer-filtered: firm routes answer an outsider 404 before reading the body; her own step routes answer her, tell the firm "the step is hers" (403) and everyone else 404; `POST /acts` gains `deliver_disclosure`, the prospect `approve_proposal` (with its rationale) and `send_to_party { proposalId }`; the presenter shortcut has its route. Client functions and hooks follow; every write invalidates the workspace on settle (a refused write must refresh what is on screen).

**Files:**
- Create: `src/mocks/workspace/prospect-view.ts`, `src/mocks/handlers/workspace-prospects.ts`, `src/hooks/use-prospect-work.ts`, `src/mocks/handlers/__tests__/workspace-prospects-api.test.ts`, `src/hooks/__tests__/use-prospect-work.test.tsx`
- Modify: `src/mocks/handlers/workspace.ts` (`POST /acts`, register the prospect handlers before the catch-all), `src/services/workspace.ts`

**Interfaces:**
- Consumes: everything Tasks 3–8 produce.
- Produces:

```ts
// src/mocks/workspace/prospect-view.ts
export function prospectView(viewerId: string, prospectId: string): ProspectView | undefined

// src/mocks/handlers/workspace-prospects.ts
export const workspaceProspectHandlers: HttpHandler[]

// src/services/workspace.ts
export const getProspects: (viewer: string) => Promise<ProspectSummary[]>
export const getProspect: (viewer: string, id: string) => Promise<ProspectView>
export const getPartySteps: (viewer: string, id: string) => Promise<PartySteps>
export const recordCoffee: (viewer: string, id: string, body: string) => Promise<Message>
export const advanceProspect: (viewer: string, id: string, to: 'reply' | 'acceptance') => Promise<StepOutcome>
export const takeHerStep: (viewer: string, id: string, step: ProspectStepName) => Promise<StepOutcome>
export const actAsProspect: (viewer: string, prospectId: string, step: ProspectStepName) => Promise<StepOutcome>
export const getProspectProposals: (viewer: string, id: string) => Promise<ProspectProposalDetail[]>
export const createProspectProposal: (viewer: string, id: string) => Promise<ProspectProposalDetail>
export const reviseProspectProposal: (viewer: string, id: string, proposalId: string, constraints: ProspectConstraint[]) => Promise<ProspectProposalDetail>
export const deliverDisclosure: (viewer: string, prospectId: string, document: DisclosureDocument) => Promise<BindingAct>
export const approveProspectProposal: (viewer: string, proposalId: string, version: number, fingerprint: string, rationale: string) => Promise<BindingAct>
export const sendProspectProposal: (viewer: string, proposalId: string) => Promise<BindingAct>

// src/hooks/use-prospect-work.ts (query keys under ['workspace', viewerId, …])
export function useProspects(enabled?: boolean): UseQueryResult<ProspectSummary[]>                    // ['workspace', v, 'prospects']
export function useProspect(id: string, enabled?: boolean): UseQueryResult<ProspectView>              // ['workspace', v, 'prospect', id]
export function usePartySteps(id: string): UseQueryResult<PartySteps>                                  // ['workspace', v, 'prospect-steps', id]
export function useProspectProposals(id: string, enabled?: boolean): UseQueryResult<ProspectProposalDetail[]>  // ['workspace', v, 'prospect-proposals', id]
export function useRecordCoffee(id: string): UseMutationResult<Message, Error, string>
export function useAdvanceProspect(id: string): UseMutationResult<StepOutcome, Error, 'reply' | 'acceptance'>
export function useHerStep(id: string): UseMutationResult<StepOutcome, Error, ProspectStepName>
export function useActAsProspect(id: string): UseMutationResult<StepOutcome, Error, ProspectStepName>
export function useCreateProspectProposal(id: string): UseMutationResult<ProspectProposalDetail, Error, void>
export function useReviseProspectProposal(id: string): UseMutationResult<ProspectProposalDetail, Error, { proposalId: string; constraints: ProspectConstraint[] }>
export function useDeliverDisclosure(id: string): UseMutationResult<BindingAct, Error, DisclosureDocument>
export function useApproveProspectProposal(): UseMutationResult<BindingAct, Error, { proposalId: string; version: number; fingerprint: string; rationale: string }>
export function useSendProspectProposal(): UseMutationResult<BindingAct, Error, string>
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/handlers/__tests__/workspace-prospects-api.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const ADRIAN = 'user-001'
const PELL = 'prsp-011'

async function throughTheSend() {
  expect((await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee after the introduction.' })).status).toBe(201)
  expect((await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'reply' })).status).toBe(201)
  const { body: proposal } = await call('POST', '/prospects/prsp-011/proposals', ADRIAN, {})
  const v1 = proposal.versions[0]
  expect((await call('POST', '/acts', ADRIAN, { kind: 'approve_proposal', proposalId: proposal.id, version: 1, fingerprint: v1.fingerprint, rationale: 'Growth fits her answers.' })).status).toBe(201)
  expect((await call('POST', '/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: PELL, document: 'form_crs' })).status).toBe(201)
  const sent = await call('POST', '/acts', ADRIAN, { kind: 'send_to_party', proposalId: proposal.id })
  expect(sent.status).toBe(201)
  return { proposal, send: sent.body }
}

describe('the prospect read model', () => {
  it('serves the firm her record with its readings; she, Robert and nobody get 404 or 401', async () => {
    const { status, body } = await call('GET', '/prospects/prsp-011', ADRIAN)
    expect(status).toBe(200)
    expect(body).toMatchObject({ id: PELL, stage: 'contact', referrerName: 'James Thompson', proposals: [], formCrsDelivered: false, deliverable: ['form_crs', 'adv_2a'],
      nextJump: { to: 'reply', at: '2026-02-26T14:10:00.000Z', blockedReason: 'Record the coffee first; her reply follows it.' } })
    expect((await call('GET', '/prospects', ADRIAN)).body).toEqual([{ id: PELL, name: 'Dr. Amanda Pell', stage: 'contact', threadId: 'th-pell', internalThreadId: 'th-pell-work' }])
    for (const viewer of [PELL, 'cli-001']) {
      for (const path of ['/prospects', '/prospects/prsp-011', '/prospects/prsp-011/proposals']) expect((await call('GET', path, viewer)).status, `${viewer} ${path}`).toBe(404)
    }
    expect((await call('GET', '/prospects/prsp-011', undefined)).status).toBe(401)
    expect((await call('GET', '/prospects/prsp-999', ADRIAN)).status).toBe(404)
  })

  it('after her reply the firm reads her profile and her transfer', async () => {
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'reply' })
    const { body } = await call('GET', '/prospects/prsp-011', 'cco-001')
    expect(body.profile).toMatchObject({ score: 66, modelName: 'Growth' })
    expect(body.transfer).toMatchObject({ transferValue: 2_100_000, totalAssets: 3_000_000 })
    expect(body.steps.map((s: { viaPresenter: { path: string } }) => s.viaPresenter.path)).toEqual(['scripted', 'scripted'])
  })
})

describe('her steps over HTTP', () => {
  it('she reads and takes her own steps; the firm is told they are hers; Robert gets 404', async () => {
    expect((await call('GET', '/prospects/prsp-011/steps', PELL)).body).toEqual({ questionnaire: 'unavailable', statements: 'unavailable', acceptance: 'unavailable' })
    expect((await call('GET', '/prospects/prsp-011/steps', 'cli-001')).status).toBe(404)
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    const answered = await call('POST', '/prospects/prsp-011/questionnaire', PELL, {})
    expect(answered).toMatchObject({ status: 201, body: { steps: { questionnaire: 'done', statements: 'open' } } })
    expect(await call('POST', '/prospects/prsp-011/statements', ADRIAN, {})).toMatchObject({ status: 403, body: { code: 'NOT_HER_STEP' } })
    expect((await call('POST', '/prospects/prsp-011/statements', 'cli-001', {})).status).toBe(404)
    expect(await call('POST', '/prospects/prsp-011/questionnaire', PELL, { answers: 'all of them' })).toMatchObject({ status: 400 })
  })

  it('the presenter shortcut and the jumps are the presenter\'s; bodies are read only after the viewer is admitted', async () => {
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    expect(await call('POST', '/presenter/act-as-prospect', ADRIAN, { prospectId: PELL, step: 'questionnaire' })).toMatchObject({ status: 201, body: { steps: { questionnaire: 'done' } } })
    expect(await call('POST', '/presenter/act-as-prospect', 'user-002', { prospectId: PELL, step: 'statements' })).toMatchObject({ status: 403 })
    expect((await call('POST', '/presenter/act-as-prospect', PELL, { prospectId: PELL, step: 'nonsense' })).status).toBe(404)
    expect(await call('POST', '/presenter/act-as-prospect', ADRIAN, { prospectId: PELL, step: 'nonsense' })).toMatchObject({ status: 400 })
    expect(await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'tomorrow' })).toMatchObject({ status: 400 })
    expect((await call('POST', '/prospects/prsp-011/advance', 'cli-001', { to: 'tomorrow' })).status).toBe(404)
  })
})

describe('prospect acts over HTTP', () => {
  it('delivers, approves with a rationale, sends; refuses what the engine refuses', async () => {
    expect(await call('POST', '/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: PELL, document: 'adv_9z' })).toMatchObject({ status: 400 })
    expect((await call('POST', '/acts', ADRIAN, { kind: 'deliver_disclosure', prospectId: 'prsp-999', document: 'form_crs' })).status).toBe(404)
    const { proposal, send } = await throughTheSend()
    expect(send).toMatchObject({ kind: 'send_to_party', delivers: ['adv_2a'], basis: { proposalId: proposal.id, version: 1 } })
    expect(await call('POST', '/acts', ADRIAN, { kind: 'send_to_party', proposalId: proposal.id })).toMatchObject({ status: 409, body: { code: 'ALREADY_SENT' } })
    expect(await call('POST', '/acts', ADRIAN, { kind: 'send_to_party' })).toMatchObject({ status: 400 })
  })

  it('her acts list carries only what reached her, stripped of the firm\'s provenance', async () => {
    await throughTheSend()
    expect((await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'acceptance' })).status).toBe(201)
    const { body } = await call('GET', '/acts?threadId=th-pell', PELL)
    expect(body.map((a: { kind: string }) => a.kind)).toEqual(['deliver_disclosure', 'send_to_party', 'accept_proposal'])
    for (const act of body) for (const key of ['subject', 'basis', 'bestInterest', 'viaPresenter', 'rationale', 'editedBy', 'messageId']) expect(act, key).not.toHaveProperty(key)
    const firm = await call('GET', '/acts?threadId=th-pell-work', ADRIAN)
    expect(firm.body[0]).toHaveProperty('bestInterest')
    expect((await call('GET', '/acts?threadId=th-pell-work', PELL)).status).toBe(404)
  })

  it('proposals over HTTP: list, revise, preview; nothing is edited or deleted', async () => {
    await call('POST', '/prospects/prsp-011/coffee', ADRIAN, { body: 'Coffee.' })
    await call('POST', '/prospects/prsp-011/advance', ADRIAN, { to: 'reply' })
    const { body: created } = await call('POST', '/prospects/prsp-011/proposals', ADRIAN, {})
    expect((await call('POST', '/prospects/prsp-011/proposals', ADRIAN, {})).status).toBe(200)
    expect(await call('POST', `/prospects/prsp-011/proposals/${created.id}/revise`, ADRIAN, { constraints: [{ kind: 'stage_diversification', tranches: 5 }] })).toMatchObject({ status: 400 })
    expect((await call('POST', `/prospects/prsp-011/proposals/${created.id}/preview`, ADRIAN, { constraints: [{ kind: 'stage_diversification', tranches: 2 }] })).body.tranches).toHaveLength(2)
    expect(await call('POST', `/prospects/prsp-011/proposals/${created.id}/revise`, ADRIAN, { constraints: [{ kind: 'stage_diversification', tranches: 2 }] })).toMatchObject({ status: 201 })
    expect((await call('GET', '/prospects/prsp-011/proposals', ADRIAN)).body[0].versions).toHaveLength(2)
    expect((await call('POST', `/prospects/prsp-011/proposals/${created.id}/revise`, PELL, { constraints: [] })).status).toBe(404)
    for (const method of ['PUT', 'PATCH', 'DELETE']) expect((await call(method, '/prospects/prsp-011', ADRIAN, {})).status, method).toBe(405)
  })
})
```

Create `src/hooks/__tests__/use-prospect-work.test.tsx`:

```tsx
import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useDeliverDisclosure, usePartySteps, useProspect, useRecordCoffee } from '@/hooks/use-prospect-work'

it('a delivery and the coffee refresh her record and her steps', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  const { result } = renderHook(() => ({
    prospect: useProspect('prsp-011'), steps: usePartySteps('prsp-011'), deliver: useDeliverDisclosure('prsp-011'), coffee: useRecordCoffee('prsp-011'),
  }), { wrapper })
  await waitFor(() => expect(result.current.prospect.data?.formCrsDelivered).toBe(false))
  await act(() => result.current.deliver.mutateAsync('form_crs'))
  await waitFor(() => expect(result.current.prospect.data?.formCrsDelivered).toBe(true))
  await act(() => result.current.coffee.mutateAsync('Coffee after the introduction.'))
  await waitFor(() => expect(result.current.steps.data?.questionnaire).toBe('open'))
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-prospects-api.test.ts src/hooks/__tests__/use-prospect-work.test.tsx --testTimeout 30000`
Expected: FAIL — the routes answer 405 (the catch-all); the hooks module does not exist.

- [ ] **Step 3: The read model**

Create `src/mocks/workspace/prospect-view.ts`:

```ts
import type { ProspectView } from '@/types/workspace-prospect'
import { deliverableNow, deliveryOf } from './disclosures'
import { partyOf } from './party'
import { readableProspectProposals } from './prospect-proposals'
import { nextJumpOf } from './prospect-steps'
import { visibleProspect } from './prospects'
import { profileOf } from './risk-scoring'
import { transferSummary } from './transfer-in'

/** The prospect as a firm viewer reads her: her record with its readings, her proposals, the next clock jump and what may be delivered. */
export function prospectView(viewerId: string, prospectId: string): ProspectView | undefined {
  const record = visibleProspect(viewerId, prospectId)
  if (!record) return undefined
  const referrerName = record.referredBy === undefined ? undefined : partyOf(record.referredBy)?.name
  const profile = profileOf(record)
  const transfer = transferSummary(record)
  const nextJump = nextJumpOf(record)
  return {
    ...record,
    ...(referrerName ? { referrerName } : {}), ...(profile ? { profile } : {}), ...(transfer ? { transfer } : {}), ...(nextJump ? { nextJump } : {}),
    proposals: readableProspectProposals(viewerId, prospectId) ?? [],
    formCrsDelivered: deliveryOf(record, 'form_crs') !== undefined,
    deliverable: deliverableNow(record),
  }
}
```

- [ ] **Step 4: The routes**

Create `src/mocks/handlers/workspace-prospects.ts`:

```ts
import { http, HttpResponse } from 'msw'
import type { RiskAnswer } from '@/types/onboarding'
import { isProspectStepName, type ProspectStepName } from '@/types/workspace-prospect'
import { prospectSummaries, visibleProspect } from '../workspace/prospects'
import { prospectView } from '../workspace/prospect-view'
import { actAsProspect, advanceProspect, herStep, partySteps, recordCoffee, type StepDone, type StepFailure } from '../workspace/prospect-steps'
import {
  createProspectProposal, parseProspectConstraints, previewProspectRevision, readableProspectProposals, reviseProspectProposal, visibleProspectProposal,
} from '../workspace/prospect-proposals'
import { viewerFrom } from '../workspace/visibility'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal, unauthorised } from './workspace-http'

function parseAnswers(value: unknown): { ok: true; value?: RiskAnswer[] } | { ok: false; message: string } {
  if (value === undefined) return { ok: true }
  if (!Array.isArray(value)) return { ok: false, message: 'answers must be a list.' }
  const answers: RiskAnswer[] = []
  for (const raw of value) {
    const fields = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
    if (!nonEmptyString(fields.questionId) || typeof fields.selectedOption !== 'number') return { ok: false, message: 'Each answer names its question and its option.' }
    answers.push({ questionId: fields.questionId, selectedOption: fields.selectedOption })
  }
  return { ok: true, value: answers }
}

const stepped = (r: StepDone | StepFailure) => (r.ok ? HttpResponse.json({ steps: r.steps, ...(r.act ? { act: r.act } : {}) }, { status: 201 }) : refusal(r))

/** A step of hers: answered for her, the firm (told 403 by the engine) and no one else; the body is read only after that. */
function herRoute(step: ProspectStepName) {
  return http.post(`/api/workspace/prospects/:id/${step}`, async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const id = String(params.id)
    if (!partySteps(viewer, id)) return notFound()
    const body = (await readJson(request)) ?? {}
    if (step === 'questionnaire') {
      const answers = parseAnswers(body.answers)
      if (!answers.ok) return badRequest(answers.message)
      return stepped(herStep(viewer, id, step, answers.value ? { answers: answers.value } : {}))
    }
    if (step === 'accept') {
      if (body.version !== undefined && typeof body.version !== 'number') return badRequest('version is a number.')
      return stepped(herStep(viewer, id, step, typeof body.version === 'number' ? { version: body.version } : {}))
    }
    return stepped(herStep(viewer, id, step))
  })
}

/** Prospects are a firm surface; only her own steps (and her steps' state) answer her. */
export const workspaceProspectHandlers = [
  http.get('/api/workspace/prospects', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    return HttpResponse.json(prospectSummaries(viewer.viewerId) ?? [])
  }),

  http.get('/api/workspace/prospects/:id', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const view = prospectView(viewer.viewerId, String(params.id))
    return view ? HttpResponse.json(view) : notFound()
  }),

  http.get('/api/workspace/prospects/:id/steps', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const steps = partySteps(viewer, String(params.id))
    return steps ? HttpResponse.json(steps) : notFound()
  }),

  http.post('/api/workspace/prospects/:id/coffee', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    const r = recordCoffee(viewer.viewerId, String(params.id), typeof body?.body === 'string' ? body.body : '')
    return r.ok ? HttpResponse.json(r.message, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/prospects/:id/advance', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const id = String(params.id)
    if (!visibleProspect(viewer.viewerId, id)) return notFound()
    const to = (await readJson(request))?.to
    if (to !== 'reply' && to !== 'acceptance') return badRequest("to must be 'reply' or 'acceptance'.")
    return stepped(advanceProspect(viewer.viewerId, id, to))
  }),

  herRoute('questionnaire'),
  herRoute('statements'),
  herRoute('accept'),

  http.get('/api/workspace/prospects/:id/proposals', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const list = readableProspectProposals(viewer.viewerId, String(params.id))
    return list ? HttpResponse.json(list) : notFound()
  }),

  http.post('/api/workspace/prospects/:id/proposals', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = createProspectProposal(viewer.viewerId, String(params.id))
    return r.ok ? HttpResponse.json(r.detail, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  http.post('/api/workspace/prospects/:id/proposals/:proposalId/revise', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const proposal = visibleProspectProposal(viewer.viewerId, String(params.proposalId))
    if (!proposal || proposal.prospectId !== params.id) return notFound()
    const parsed = parseProspectConstraints((await readJson(request))?.constraints)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = reviseProspectProposal(viewer.viewerId, proposal.id, parsed.value)
    return r.ok ? HttpResponse.json(r.detail, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/prospects/:id/proposals/:proposalId/preview', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const proposal = visibleProspectProposal(viewer.viewerId, String(params.proposalId))
    if (!proposal || proposal.prospectId !== params.id) return notFound()
    const parsed = parseProspectConstraints((await readJson(request))?.constraints)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = previewProspectRevision(viewer.viewerId, proposal.id, parsed.value)
    return r.ok ? HttpResponse.json(r.preview) : refusal(r)
  }),

  http.post('/api/workspace/presenter/act-as-prospect', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    if (!body || !nonEmptyString(body.prospectId) || !isProspectStepName(body.step)) return badRequest('prospectId and step (questionnaire, statements or accept) are required.')
    return stepped(actAsProspect(viewer.viewerId, body.prospectId, body.step))
  }),
]
```

In `src/mocks/handlers/workspace.ts` `POST /acts`, replace the `approve_proposal` and `send_to_party` cases and add `deliver_disclosure`:

```ts
      case 'send_to_party': {
        if (nonEmptyString(body.proposalId)) {
          const r = sendProspectProposal(viewer, body.proposalId)
          return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
        }
        if (!nonEmptyString(body.draftId)) return badRequest('draftId or proposalId is required.')
        const r = sendToParty(viewer, body.draftId)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'deliver_disclosure': {
        if (!nonEmptyString(body.prospectId)) return badRequest('prospectId is required.')
        if (!visibleProspect(viewer, body.prospectId)) return notFound()
        if (!isDisclosureDocument(body.document)) return badRequest('document must be form_crs, adv_2a, adv_2b or privacy_notice.')
        const r = deliverDisclosure(viewer, body.prospectId, body.document)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
      case 'approve_proposal': {
        if (!nonEmptyString(body.proposalId)) return badRequest('proposalId is required.')
        if (prospectProposalById(body.proposalId)) {
          if (!visibleProspectProposal(viewer, body.proposalId)) return notFound()
          if (typeof body.version !== 'number' || !nonEmptyString(body.fingerprint) || typeof body.rationale !== 'string') {
            return badRequest('version (a number), fingerprint and rationale are required.')
          }
          const r = approveProspectProposal(viewer, body.proposalId, body.version, body.fingerprint, body.rationale)
          return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
        }
        if (!visibleProposal(viewer, body.proposalId)) return notFound()
        if (typeof body.version !== 'number' || !nonEmptyString(body.fingerprint)) return badRequest('version (a number) and fingerprint are required.')
        const r = approveProposal(viewer, body.proposalId, body.version, body.fingerprint)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
```

(imports: `isDisclosureDocument` from `@/types/workspace-prospect`; `deliverDisclosure` from `../workspace/disclosures`; `approveProspectProposal, sendProspectProposal` from `../workspace/prospect-acts`; `prospectProposalById, visibleProspectProposal` from `../workspace/prospect-proposals`; `visibleProspect` from `../workspace/prospects`; `workspaceProspectHandlers` from `./workspace-prospects`) and add `...workspaceProspectHandlers,` after `...workspaceMeetingHandlers,` (above the catch-all).

- [ ] **Step 5: Client functions and hooks**

Append to `src/services/workspace.ts` (with the type imports from `@/types/workspace-prospect`):

```ts
export const getProspects = (viewer: string) =>
  get<ProspectSummary[]>('/workspace/prospects', undefined, as(viewer))
export const getProspect = (viewer: string, id: string) =>
  get<ProspectView>(`/workspace/prospects/${id}`, undefined, as(viewer))
export const getPartySteps = (viewer: string, id: string) =>
  get<PartySteps>(`/workspace/prospects/${id}/steps`, undefined, as(viewer))
export const recordCoffee = (viewer: string, id: string, body: string) =>
  post<Message>(`/workspace/prospects/${id}/coffee`, { body }, as(viewer))
export const advanceProspect = (viewer: string, id: string, to: 'reply' | 'acceptance') =>
  post<StepOutcome>(`/workspace/prospects/${id}/advance`, { to }, as(viewer))
/** One of her own steps, taken as her (View as): her scripted answers, her statements, or acceptance of the version sent to her. */
export const takeHerStep = (viewer: string, id: string, step: ProspectStepName) =>
  post<StepOutcome>(`/workspace/prospects/${id}/${step}`, {}, as(viewer))
/** The presenter shortcut: her step, recorded as her with the shortcut marked. */
export const actAsProspect = (viewer: string, prospectId: string, step: ProspectStepName) =>
  post<StepOutcome>('/workspace/presenter/act-as-prospect', { prospectId, step }, as(viewer))
export const getProspectProposals = (viewer: string, id: string) =>
  get<ProspectProposalDetail[]>(`/workspace/prospects/${id}/proposals`, undefined, as(viewer))
export const createProspectProposal = (viewer: string, id: string) =>
  post<ProspectProposalDetail>(`/workspace/prospects/${id}/proposals`, {}, as(viewer))
export const reviseProspectProposal = (viewer: string, id: string, proposalId: string, constraints: ProspectConstraint[]) =>
  post<ProspectProposalDetail>(`/workspace/prospects/${id}/proposals/${proposalId}/revise`, { constraints }, as(viewer))
export const deliverDisclosure = (viewer: string, prospectId: string, document: DisclosureDocument) =>
  post<BindingAct>('/workspace/acts', { kind: 'deliver_disclosure', prospectId, document }, as(viewer))
export const approveProspectProposal = (viewer: string, proposalId: string, version: number, fingerprint: string, rationale: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'approve_proposal', proposalId, version, fingerprint, rationale }, as(viewer))
export const sendProspectProposal = (viewer: string, proposalId: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'send_to_party', proposalId }, as(viewer))
```

Create `src/hooks/use-prospect-work.ts`:

```ts
import { useMutation, useQuery } from '@tanstack/react-query'
import * as api from '@/services/workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { DisclosureDocument, ProspectConstraint, ProspectStepName } from '@/types/workspace-prospect'
import { useInvalidateWorkspace } from './use-workspace'

export function useProspects(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospects'], queryFn: () => api.getProspects(viewerId), enabled })
}

export function useProspect(id: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospect', id], queryFn: () => api.getProspect(viewerId, id), enabled })
}

export function usePartySteps(id: string) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospect-steps', id], queryFn: () => api.getPartySteps(viewerId, id) })
}

export function useProspectProposals(id: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'prospect-proposals', id], queryFn: () => api.getProspectProposals(viewerId, id), enabled })
}

// Every prospect write invalidates on settle, not success: a refused write (sent meanwhile, already answered) must refresh what is on screen too.

export function useRecordCoffee(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (body: string) => api.recordCoffee(viewerId, id, body), onSettled: invalidate })
}

export function useAdvanceProspect(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (to: 'reply' | 'acceptance') => api.advanceProspect(viewerId, id, to), onSettled: invalidate })
}

export function useHerStep(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (step: ProspectStepName) => api.takeHerStep(viewerId, id, step), onSettled: invalidate })
}

export function useActAsProspect(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (step: ProspectStepName) => api.actAsProspect(viewerId, id, step), onSettled: invalidate })
}

export function useCreateProspectProposal(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.createProspectProposal(viewerId, id), onSettled: invalidate })
}

export function useReviseProspectProposal(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ proposalId, constraints }: { proposalId: string; constraints: ProspectConstraint[] }) => api.reviseProspectProposal(viewerId, id, proposalId, constraints),
    onSettled: invalidate,
  })
}

export function useDeliverDisclosure(id: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (document: DisclosureDocument) => api.deliverDisclosure(viewerId, id, document), onSettled: invalidate })
}

export function useApproveProspectProposal() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ proposalId, version, fingerprint, rationale }: { proposalId: string; version: number; fingerprint: string; rationale: string }) =>
      api.approveProspectProposal(viewerId, proposalId, version, fingerprint, rationale),
    onSettled: invalidate,
  })
}

export function useSendProspectProposal() {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (proposalId: string) => api.sendProspectProposal(viewerId, proposalId), onSettled: invalidate })
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-prospects-api.test.ts src/hooks/__tests__/use-prospect-work.test.tsx src/mocks/handlers/__tests__/external-boundary-api.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(prospects): endpoints, client functions and hooks — firm routes 404 to outsiders, her own steps answer her

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 10: Her thread — the firm's context column, her own steps, the shortcut

Her thread "Dr. Amanda Pell" (band "PROSPECT CAN SEE") shows Adrian's messages, the delivered disclosures, her replies and the sent proposal. For the firm, the context column adds where she stands, the disclosures timeline with its deliver acts, the clock (record the coffee; the labelled jumps), the send of the approved version, and — for the presenter — "Demo · act as Dr. Pell". Viewing as her, the column shows only "Your steps" and her record slips.

**Files:**
- Create: `src/workspace/prospect/ProspectPanel.tsx`, `src/workspace/prospect/DisclosureTimeline.tsx`, `src/workspace/prospect/ProspectClock.tsx`, `src/workspace/prospect/SendProposal.tsx`, `src/workspace/prospect/ActAsProspect.tsx`, `src/workspace/prospect/PartyStepsPanel.tsx`, `src/workspace/__tests__/prospect-thread.test.tsx`
- Modify: `src/workspace/context/ContextColumn.tsx`, `src/workspace/prospect/prospect-words.ts`, `src/kit/measure.ts` (`fmtEasternDayTime`), `src/kit/__tests__/measure.test.ts`

**Interfaces:**
- Consumes: the Task 9 hooks; `ConfirmRecord`, `ContextSection`; `threadParty`, `addressNameOf` (Task 2); `PRESENTER_ID`; `STAGE_WORDS` (Task 3); `DISCLOSURE_DOCUMENTS`, `DISCLOSURE_TITLES`.
- Produces:

```ts
// src/kit/measure.ts
export function fmtEasternDayTime(iso: string): string                    // "2026-02-26T14:10:00.000Z" → "Thu 26 Feb 09:10 ET"
// src/workspace/prospect/prospect-words.ts (added)
export const DISCLOSURE_SHORT: Readonly<Record<DisclosureDocument, string>>   // 'Form CRS', 'ADV Part 2A', 'ADV Part 2B', 'privacy notice'
export const DISCLOSURE_TIMING: Readonly<Record<DisclosureDocument, string>>
export const COFFEE_NOTE_DRAFT: string
// components (props)
ProspectPanel({ prospectId: string; directory: Directory; onRecorded: (actId: string) => void })
PartyStepsPanel({ prospectId: string; onRecorded: (actId: string) => void })
```

- [ ] **Step 1: Write the failing tests**

Add to `src/kit/__tests__/measure.test.ts`:

```ts
import { fmtEasternDayTime } from '@/kit/measure'

it('states a jump as the control names it', () => {
  expect(fmtEasternDayTime('2026-02-26T14:10:00.000Z')).toBe('Thu 26 Feb 09:10 ET')
  expect(fmtEasternDayTime('2026-03-02T15:00:00.000Z')).toBe('Mon 2 Mar 10:00 ET')
})
```

Create `src/workspace/__tests__/prospect-thread.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'
import { PELL_REPLY } from '@/mocks/data/prospect-script'
import { advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee } from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const section = (name: string) => inContext().findByRole('region', { name })

async function openHerThread() {
  renderRoutes(routes, '/t/th-pell')
  await screen.findByRole('heading', { level: 1, name: 'Dr. Amanda Pell' })
}
async function approvedV1() {
  await recordCoffee(ADRIAN, PELL, 'Coffee after the introduction.')
  await advanceProspect(ADRIAN, PELL, 'reply')
  const proposal = await createProspectProposal(ADRIAN, PELL)
  await approveProspectProposal(ADRIAN, proposal.id, 1, proposal.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
}

describe('her thread, for the firm', () => {
  afterEach(() => sessionStorage.clear())

  it('says where she stands and delivers Form CRS as a binding act, once, however fast the confirm is pressed', async () => {
    const user = userEvent.setup()
    await openHerThread()
    expect(await section('Prospect')).toHaveTextContent('Referred by James Thompson')
    const disclosures = await section('Disclosures')
    expect(within(disclosures).queryByRole('button', { name: 'Deliver ADV Part 2B' })).toBeNull()
    await user.click(within(disclosures).getByRole('button', { name: 'Deliver Form CRS' }))
    const dialog = await screen.findByRole('dialog', { name: 'Deliver Form CRS to Dr. Amanda Pell?' })
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await conversation().findByRole('article', { name: 'Delivered · Form CRS (client relationship summary)' })).toBeInTheDocument()
    expect(store().acts.filter((a) => a.kind === 'deliver_disclosure')).toHaveLength(1)
    await waitFor(() => expect(within(disclosures).queryByRole('button', { name: 'Deliver Form CRS' })).toBeNull())
    expect(disclosures).toHaveTextContent('REC-0001')
  })

  it('the advance waits for the coffee and says so; the presenter records the coffee and her reply arrives on Thursday', async () => {
    const user = userEvent.setup()
    await openHerThread()
    const clock = await section('Clock')
    const jump = within(clock).getByRole('button', { name: 'Advance to her reply · Thu 26 Feb 09:10 ET' })
    expect(jump).toBeDisabled()
    expect(jump).toHaveAccessibleDescription('Record the coffee first; her reply follows it.')
    await user.click(within(clock).getByRole('button', { name: 'Record the coffee' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record the coffee' })
    await user.click(within(dialog).getByRole('button', { name: 'Record' }))
    await waitFor(() => expect(clock).toHaveTextContent('Coffee recorded'))
    await user.dblClick(await within(clock).findByRole('button', { name: 'Advance to her reply · Thu 26 Feb 09:10 ET' }))
    expect(await conversation().findByText(PELL_REPLY)).toBeInTheDocument()
    expect(conversation().getByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeInTheDocument()
    expect(store().messages.filter((m) => m.kind === 'party_step')).toHaveLength(2)
    await waitFor(() => expect(within(clock).queryByRole('button', { name: /Advance to her reply/ })).toBeNull())
  })

  it('Sarah reads where she stands but neither delivers nor moves the clock nor acts as her', async () => {
    viewAsOnLoad('user-002')
    await openHerThread()
    await section('Disclosures')
    expect(inContext().queryByRole('button', { name: /^Deliver/ })).toBeNull()
    expect(inContext().queryByRole('button', { name: /^Advance/ })).toBeNull()
    expect(inContext().queryByRole('region', { name: 'Demo · act as Dr. Pell' })).toBeNull()
  })

  it('the presenter answers her questionnaire through the shortcut; it is recorded as her, marked', async () => {
    const user = userEvent.setup()
    await recordCoffee(ADRIAN, PELL, 'Coffee.')
    await openHerThread()
    const demo = await section('Demo · act as Dr. Pell')
    await user.click(within(demo).getByRole('button', { name: 'Answer her questionnaire' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Answer her questionnaire as Dr. Pell?' })).getByRole('button', { name: 'Confirm' }))
    expect(await conversation().findByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeInTheDocument()
    expect(store().prospects[0]?.steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'shortcut' })
  })

  it('the send waits for Form CRS, then delivers ADV 2A in the same record, before the proposal', async () => {
    const user = userEvent.setup()
    await approvedV1()
    await openHerThread()
    const proposal = await section('Proposal')
    await user.click(within(proposal).getByRole('button', { name: 'Send v1 to Dr. Pell' }))
    let dialog = await screen.findByRole('dialog', { name: 'Send v1 to Dr. Pell?' })
    expect(dialog).toHaveTextContent('Deliver Form CRS first: it comes before or with the first recommendation.')
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(within(await section('Disclosures')).getByRole('button', { name: 'Deliver Form CRS' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Deliver Form CRS to Dr. Amanda Pell?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(proposal).getByRole('button', { name: 'Send v1 to Dr. Pell' })).toBeEnabled())
    await waitFor(() => expect(store().prospects[0]?.disclosures).toHaveLength(1))
    await user.click(within(proposal).getByRole('button', { name: 'Send v1 to Dr. Pell' }))
    dialog = await screen.findByRole('dialog', { name: 'Send v1 to Dr. Pell?' })
    expect(dialog).toHaveTextContent('Form ADV Part 2A (firm brochure) is delivered with it, in the same record.')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await conversation().findByRole('article', { name: 'Delivered · Form ADV Part 2A (firm brochure)' })).toBeInTheDocument()
    expect(conversation().getByText(/^Dear Dr\. Pell,/)).toBeInTheDocument()
    await waitFor(() => expect(proposal).toHaveTextContent('Sent v1'))
  })
})

describe('her thread, as she sees it', () => {
  afterEach(() => sessionStorage.clear())

  it('only her thread, her steps, her slips — nothing of the firm\'s', async () => {
    const user = userEvent.setup()
    await recordCoffee(ADRIAN, PELL, 'Coffee.')
    await deliverDisclosure(ADRIAN, PELL, 'form_crs')
    viewAsOnLoad(PELL)
    await openHerThread()
    expect(screen.getByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toBeInTheDocument()
    const links = within(screen.getByRole('navigation', { name: 'Threads' })).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAccessibleName('Dr. Amanda Pell')
    const steps = await section('Your steps')
    await user.click(within(steps).getByRole('button', { name: 'Answer the questionnaire' }))
    expect(await conversation().findByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeInTheDocument()
    expect(store().prospects[0]?.steps[0]?.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'view_as' })
    for (const name of ['Prospect', 'Disclosures', 'Clock', 'Proposal', 'Demo · act as Dr. Pell']) expect(inContext().queryByRole('region', { name })).toBeNull()
    expect(screen.getByRole('main').textContent).not.toMatch(/binding|Supervisory review|Mike Chen|Transfer-In|Prospect Profile|best-interest|prospect work/i)
    await waitFor(() => expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Document from Adrian Hale'))
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/workspace/__tests__/prospect-thread.test.tsx src/kit/__tests__/measure.test.ts --testTimeout 30000`
Expected: FAIL — no Prospect section; `fmtEasternDayTime` does not exist.

- [ ] **Step 3: The format and the words**

Add to `src/kit/measure.ts`:

```ts
const easternDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/New_York' })
/** A moment on the story's clock as its control names it: "Thu 26 Feb 09:10 ET". */
export function fmtEasternDayTime(iso: string): string {
  return `${easternDay.format(parseIso(iso)).replace(',', '')} ${fmtEasternTime(iso)} ET`
}
```

Add to `src/workspace/prospect/prospect-words.ts`:

```ts
import type { DisclosureDocument } from '@/types/workspace-prospect'

export const DISCLOSURE_SHORT: Readonly<Record<DisclosureDocument, string>> = {
  form_crs: 'Form CRS', adv_2a: 'ADV Part 2A', adv_2b: 'ADV Part 2B', privacy_notice: 'privacy notice',
}

/** When each document is due, as the firm's rule states it. */
export const DISCLOSURE_TIMING: Readonly<Record<DisclosureDocument, string>> = {
  form_crs: 'Before or at the first recommendation', adv_2a: 'At or before the proposal (or with it)',
  adv_2b: 'At onboarding', privacy_notice: 'At onboarding',
}

/** What the presenter starts from when recording the coffee; it is Adrian's note and he may change any of it. */
export const COFFEE_NOTE_DRAFT =
  "Coffee with Dr. Pell after James Thompson's introduction. She holds a taxable brokerage account at Fidelity, with a large, low-basis Stryker position from early in her career, and a 403(b) from her former hospital employer. She asked about rolling over the 403(b); I said a comparison would follow. I gave her the risk questionnaire and asked for her statements."
```

- [ ] **Step 4: The firm's panels**

Create `src/workspace/prospect/DisclosureTimeline.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Tag } from '@/kit/tag/Tag'
import { fmtTimestamp } from '@/kit/measure'
import { useDeliverDisclosure } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { DISCLOSURE_DOCUMENTS, DISCLOSURE_TITLES, type DisclosureDocument, type ProspectView } from '@/types/workspace-prospect'
import { DISCLOSURE_SHORT, DISCLOSURE_TIMING } from './prospect-words'

type Props = { view: ProspectView; canDeliver: boolean; onRecorded: (actId: string) => void }

/** Each disclosure: delivered when, by which record — or, when it may be delivered now, the binding act that delivers it. */
export function DisclosureTimeline({ view, canDeliver, onRecorded }: Props) {
  const deliver = useDeliverDisclosure(view.id)
  const [confirming, setConfirming] = useState<DisclosureDocument>()
  return (
    <ContextSection title="Disclosures">
      <ol aria-label="Disclosures" className="flex flex-col gap-3">
        {DISCLOSURE_DOCUMENTS.map((document) => {
          const delivered = view.disclosures.find((d) => d.document === document)
          return (
            <li key={document} className="flex flex-col items-start gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-body">{DISCLOSURE_TITLES[document]}</span>
                {delivered ? <Tag tone="solid">Delivered</Tag> : null}
              </div>
              {delivered
                ? <span className="tabular text-label text-ink-3">{`${fmtTimestamp(delivered.at)} · ${delivered.actId}`}</span>
                : <span className="text-label text-ink-3">{DISCLOSURE_TIMING[document]}</span>}
              {!delivered && canDeliver && view.deliverable.includes(document) ? (
                <Button rank="secondary" onClick={() => { deliver.reset(); setConfirming(document) }}>{`Deliver ${DISCLOSURE_SHORT[document]}`}</Button>
              ) : null}
            </li>
          )
        })}
      </ol>
      {confirming ? (
        <ConfirmRecord open onClose={() => setConfirming(undefined)} mutation={deliver} variables={confirming} onRecorded={onRecorded}
          title={`Deliver ${DISCLOSURE_SHORT[confirming]} to ${view.name}?`}
          description="Delivery is a binding act: the record names you, the document and the time, and she sees it in her thread." />
      ) : null}
    </ContextSection>
  )
}
```

Create `src/workspace/prospect/ProspectClock.tsx`:

```tsx
import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { TextInput } from '@/kit/text-input/TextInput'
import { fmtEasternDayTime } from '@/kit/measure'
import { useAdvanceProspect, useRecordCoffee } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { ProspectView } from '@/types/workspace-prospect'
import { COFFEE_NOTE_DRAFT } from './prospect-words'

type Props = { view: ProspectView; canRecordCoffee: boolean; presents: boolean }

/** The story's clock: the coffee (its note moves the clock to the coffee's end) and the presenter's labelled jumps. Never backwards. */
export function ProspectClock({ view, canRecordCoffee, presents }: Props) {
  const coffee = useRecordCoffee(view.id)
  const advance = useAdvanceProspect(view.id)
  const [writing, setWriting] = useState(false)
  const [note, setNote] = useState(COFFEE_NOTE_DRAFT)
  // A ref, not render state, so a second click in the same frame cannot record twice or jump twice.
  const busy = useRef(false)
  const reasonId = useId()
  const jump = presents ? view.nextJump : undefined
  if (!canRecordCoffee && !jump) return null

  const once = (run: (settled: () => void) => void) => {
    if (busy.current) return
    busy.current = true
    run(() => { busy.current = false })
  }
  const record = () => once((settled) => coffee.mutate(note, { onSuccess: () => setWriting(false), onSettled: settled }))
  const go = (to: 'reply' | 'acceptance') => once((settled) => advance.mutate(to, { onSettled: settled }))

  return (
    <ContextSection title="Clock">
      {view.coffee ? <p className="text-body text-ink-2">Coffee recorded · the note is in the prospect work thread.</p>
        : canRecordCoffee ? <Button rank="secondary" className="self-start" onClick={() => { coffee.reset(); setWriting(true) }}>Record the coffee</Button>
        : null}
      <Dialog open={writing} onOpenChange={(open) => { if (!open && !coffee.isPending) setWriting(false) }} title="Record the coffee"
        description="The note is filed in her internal thread, and the clock moves to the end of the coffee.">
        <div className="flex flex-col gap-4">
          <TextInput label="Note" value={note} onChange={setNote} rows={6} />
          {coffee.isError ? <p role="alert" className="text-body">{coffee.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={coffee.isPending} onClick={() => setWriting(false)}>Cancel</Button>
            <Button disabled={coffee.isPending || note.trim().length === 0} onClick={record}>Record</Button>
          </div>
        </div>
      </Dialog>
      {jump ? (
        <div className="flex flex-col items-start gap-1.5">
          <Button rank="secondary" disabled={advance.isPending || jump.blockedReason !== undefined} aria-describedby={jump.blockedReason ? reasonId : undefined} onClick={() => go(jump.to)}>
            {`Advance to her ${jump.to} · ${fmtEasternDayTime(jump.at)}`}
          </Button>
          {jump.blockedReason ? <p id={reasonId} className="text-label text-ink-3">{jump.blockedReason}</p> : null}
        </div>
      ) : null}
      {advance.isError ? <p role="alert" className="text-body">{advance.error.message}</p> : null}
    </ContextSection>
  )
}
```

Create `src/workspace/prospect/SendProposal.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { fmtTimestamp } from '@/kit/measure'
import { useSendProspectProposal } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import { addressNameOf } from '@/lib/words'
import { DISCLOSURE_TITLES, type ProspectView } from '@/types/workspace-prospect'

type Props = { view: ProspectView; canSend: boolean; onRecorded: (actId: string) => void }

/** The approved version, sent to her as a binding act: Form CRS first; ADV 2A goes with it when she has not had it. */
export function SendProposal({ view, canSend, onRecorded }: Props) {
  const send = useSendProspectProposal()
  const [open, setOpen] = useState(false)
  const proposal = view.proposals[0]
  if (!proposal) return null
  const latest = proposal.versions[proposal.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${proposal.id} has no versions`)
  if (proposal.sent) {
    return (
      <ContextSection title="Proposal">
        <p className="tabular text-body">{`Sent v${proposal.sent.version} · ${proposal.sent.actId} · ${fmtTimestamp(proposal.sent.at)}`}</p>
        {proposal.accepted ? <p className="tabular text-body">{`Accepted v${proposal.accepted.version} · ${proposal.accepted.actId} · ${fmtTimestamp(proposal.accepted.at)}`}</p> : null}
      </ContextSection>
    )
  }
  const approval = proposal.approval
  if (!approval) {
    return <ContextSection title="Proposal"><p className="text-body text-ink-2">{`v${latest.n} is drafted. Approve a version in the prospect work thread before sending it.`}</p></ContextSection>
  }
  const name = addressNameOf(view.name)
  const blockedReason = !view.formCrsDelivered ? 'Deliver Form CRS first: it comes before or with the first recommendation.'
    : latest.n !== approval.version ? `v${latest.n} is newer than the approved v${approval.version}; approve the version you mean to send.`
    : undefined
  const withAdv2a = !view.disclosures.some((d) => d.document === 'adv_2a')
  return (
    <ContextSection title="Proposal">
      <p className="tabular text-body">{`v${approval.version} is approved (${approval.actId}).`}</p>
      {canSend ? <Button className="self-start" onClick={() => { send.reset(); setOpen(true) }}>{`Send v${approval.version} to ${name}`}</Button> : null}
      <ConfirmRecord open={open} onClose={() => setOpen(false)} mutation={send} variables={proposal.id} onRecorded={onRecorded}
        title={`Send v${approval.version} to ${name}?`}
        description={withAdv2a ? `${DISCLOSURE_TITLES.adv_2a} is delivered with it, in the same record.` : 'The record names you, the version and the time.'}
        blockedReason={blockedReason} />
    </ContextSection>
  )
}
```

Create `src/workspace/prospect/ActAsProspect.tsx`:

```tsx
import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { useActAsProspect, usePartySteps } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import { addressNameOf } from '@/lib/words'
import type { PartySteps, ProspectStepName, ProspectView } from '@/types/workspace-prospect'

type Props = { view: ProspectView; onRecorded: (actId: string) => void }

const label = (step: ProspectStepName, steps: PartySteps) =>
  step === 'questionnaire' ? 'Answer her questionnaire' : step === 'statements' ? 'Share her statements' : `Accept v${steps.sentVersion ?? '?'}`

/** The one-presenter demo: her scripted step, recorded as her with the shortcut marked. Shown only to the presenter. */
export function ActAsProspect({ view, onRecorded }: Props) {
  const steps = usePartySteps(view.id)
  const shortcut = useActAsProspect(view.id)
  const [confirming, setConfirming] = useState<ProspectStepName>()
  const busy = useRef(false)
  const noteId = useId()
  if (!steps.data) return null
  const s = steps.data
  const open: ProspectStepName[] = [
    ...(s.questionnaire === 'open' ? ['questionnaire' as const] : []), ...(s.statements === 'open' ? ['statements' as const] : []),
    ...(s.acceptance === 'open' ? ['accept' as const] : []),
  ]
  if (open.length === 0) return null
  const name = addressNameOf(view.name)
  const confirm = () => {
    if (!confirming || busy.current) return
    busy.current = true
    shortcut.mutate(confirming, {
      onSuccess: (outcome) => { setConfirming(undefined); if (outcome.act) onRecorded(outcome.act.id) },
      onSettled: () => { busy.current = false },
    })
  }
  return (
    <ContextSection title={`Demo · act as ${name}`}>
      <p id={noteId} className="text-label text-ink-3">{`Presenter shortcut: records ${name}'s scripted step as her, marked as made through this shortcut.`}</p>
      <div className="flex flex-wrap gap-2">
        {open.map((step) => (
          <Button key={step} rank="secondary" aria-describedby={noteId} onClick={() => { shortcut.reset(); setConfirming(step) }}>{label(step, s)}</Button>
        ))}
      </div>
      <Dialog open={confirming !== undefined} onOpenChange={(next) => { if (!next && !shortcut.isPending) setConfirming(undefined) }}
        title={confirming ? `${label(confirming, s)} as ${name}?` : ''} description={`Recorded as ${view.name}, with the presenter shortcut noted.`}>
        <div className="flex flex-col gap-4">
          {shortcut.isError ? <p role="alert" className="text-body">{shortcut.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={shortcut.isPending} onClick={() => setConfirming(undefined)}>Cancel</Button>
            <Button disabled={shortcut.isPending} onClick={confirm}>Confirm</Button>
          </div>
        </div>
      </Dialog>
    </ContextSection>
  )
}
```

Create `src/workspace/prospect/ProspectPanel.tsx`:

```tsx
import { Tag } from '@/kit/tag/Tag'
import { useProspect } from '@/hooks/use-prospect-work'
import { PRESENTER_ID } from '@/lib/presenter'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { Directory } from '@/types/workspace'
import { ActAsProspect } from './ActAsProspect'
import { DisclosureTimeline } from './DisclosureTimeline'
import { ProspectClock } from './ProspectClock'
import { SendProposal } from './SendProposal'
import { STAGE_WORDS } from './prospect-words'

type Props = { prospectId: string; directory: Directory; onRecorded: (actId: string) => void }

/** Her thread's context, for the firm: where she stands, what she has been given, the clock, the send, and the presenter's shortcut. */
export function ProspectPanel({ prospectId, directory, onRecorded }: Props) {
  const { viewerId } = useViewer()
  const prospect = useProspect(prospectId)
  if (prospect.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the prospect…</p>
  if (prospect.isError) return <p role="alert" className="py-5 text-body">{prospect.error.message}</p>
  const view = prospect.data
  const permissions = directory.permissions[viewerId] ?? []
  // The one presenter moves the clock and acts for her; the engine refuses anyone else.
  const presents = viewerId === PRESENTER_ID
  return (
    <>
      <ContextSection title="Prospect">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Tag tone="solid">{STAGE_WORDS[view.stage]}</Tag>
          {view.referrerName ? <span className="text-body text-ink-2">{`Referred by ${view.referrerName}`}</span> : null}
        </div>
      </ContextSection>
      <DisclosureTimeline view={view} canDeliver={permissions.includes('deliver_disclosure')} onRecorded={onRecorded} />
      <ProspectClock view={view} canRecordCoffee={permissions.includes('prepare_meeting')} presents={presents} />
      <SendProposal view={view} canSend={permissions.includes('send_to_party')} onRecorded={onRecorded} />
      {presents ? <ActAsProspect view={view} onRecorded={onRecorded} /> : null}
    </>
  )
}
```

- [ ] **Step 5: Her own steps, and the column**

Create `src/workspace/prospect/PartyStepsPanel.tsx`:

```tsx
import { useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { Tag } from '@/kit/tag/Tag'
import { useHerStep, usePartySteps } from '@/hooks/use-prospect-work'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { ProspectStepName, StepState } from '@/types/workspace-prospect'

type Props = { prospectId: string; onRecorded: (actId: string) => void }

/** Her own next steps in her thread: answer the questionnaire, share her statements, accept the proposal sent to her. */
export function PartyStepsPanel({ prospectId, onRecorded }: Props) {
  const steps = usePartySteps(prospectId)
  const take = useHerStep(prospectId)
  const [accepting, setAccepting] = useState(false)
  const busy = useRef(false)
  if (steps.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading your steps…</p>
  if (steps.isError) return <p role="alert" className="py-5 text-body">{steps.error.message}</p>
  const s = steps.data
  const run = (step: ProspectStepName) => {
    if (busy.current) return
    busy.current = true
    take.mutate(step, {
      onSuccess: (outcome) => { setAccepting(false); if (outcome.act) onRecorded(outcome.act.id) },
      onSettled: () => { busy.current = false },
    })
  }
  return (
    <ContextSection title="Your steps">
      <ul className="flex flex-col gap-3">
        <StepLine label="Risk questionnaire" state={s.questionnaire} action="Answer the questionnaire" waiting="After your first meeting." pending={take.isPending} onRun={() => run('questionnaire')} />
        <StepLine label="Statements" state={s.statements} action="Share my statements" waiting="After your first meeting." pending={take.isPending} onRun={() => run('statements')} />
        <StepLine label="Proposal" state={s.acceptance} action={`Accept v${s.sentVersion ?? ''}`} waiting="When a proposal is sent to you." pending={take.isPending} onRun={() => { take.reset(); setAccepting(true) }} />
      </ul>
      {take.isError && !accepting ? <p role="alert" className="text-body">{take.error.message}</p> : null}
      <Dialog open={accepting} onOpenChange={(open) => { if (!open && !take.isPending) setAccepting(false) }} title={`Accept v${s.sentVersion ?? ''}?`}
        description="Your acceptance is recorded, and the firm opens your account paperwork.">
        <div className="flex flex-col gap-4">
          {take.isError ? <p role="alert" className="text-body">{take.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={take.isPending} onClick={() => setAccepting(false)}>Cancel</Button>
            <Button disabled={take.isPending} onClick={() => run('accept')}>Accept</Button>
          </div>
        </div>
      </Dialog>
    </ContextSection>
  )
}

type StepLineProps = { label: string; state: StepState; action: string; waiting: string; pending: boolean; onRun: () => void }

function StepLine({ label, state, action, waiting, pending, onRun }: StepLineProps) {
  return (
    <li className="flex flex-col items-start gap-1">
      <span className="text-body">{label}</span>
      {state === 'done' ? <Tag tone="solid">Done</Tag>
        : state === 'open' ? <Button rank="secondary" disabled={pending} onClick={onRun}>{action}</Button>
        : <span className="text-label text-ink-3">{waiting}</span>}
    </li>
  )
}
```

In `src/workspace/context/ContextColumn.tsx`, after `<WhoCanSee … />`:

```tsx
      {t.visibility === 'client' && threadParty(t) === 'prospect' && t.partyId !== undefined && !viewerIsExternal
        ? <ProspectPanel prospectId={t.partyId} directory={dir} onRecorded={setSentActId} /> : null}
      {t.visibility === 'client' && threadParty(t) === 'prospect' && t.partyId !== undefined && viewerIsExternal
        ? <PartyStepsPanel prospectId={t.partyId} onRecorded={setSentActId} /> : null}
```

(imports: `threadParty` from `@/workspace/people/thread-party`, the two panels from `@/workspace/prospect/…`).

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/prospect-thread.test.tsx src/workspace/__tests__/context.test.tsx src/workspace/__tests__/thread.test.tsx src/kit/__tests__/measure.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(prospects): her thread — disclosures, the clock, the send and the shortcut for the firm; her own steps for her

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 11: The internal thread — the agents, the proposal embed, approval with the best-interest record, the onboarding checklist

"Pell · prospect work" (band "Firm only · prospect can't see") carries the Profile and Transfer-In findings, the proposal embed (always its latest version, with its model, transfer plan, staged option, held-away 403(b), fees, the close it is priced at and its versions), Revise, and in the context column the approval with the best-interest record, the rollover follow-up and, after acceptance, the onboarding checklist with its deliveries.

**Files:**
- Create: `src/workspace/prospect/ProspectProposalEmbed.tsx`, `src/workspace/prospect/ReviseProspectDialog.tsx`, `src/workspace/prospect/ProspectApproval.tsx`, `src/workspace/prospect/OnboardingChecklist.tsx`, `src/workspace/prospect/ProspectWorkPanel.tsx`, `src/workspace/prospect/ProspectAgentControl.tsx`, `src/workspace/__tests__/prospect-work.test.tsx`
- Modify: `src/workspace/thread/MessageView.tsx` (`prospect_proposal`), `src/workspace/context/AskAgents.tsx`, `src/workspace/context/ContextColumn.tsx`, `src/workspace/prospect/prospect-words.ts` (`RATIONALE_DRAFT`, `TRANCHE_OPTIONS`)

**Interfaces:**
- Consumes: Task 9 hooks (`useProspect`, `useProspectProposals`, `useCreateProspectProposal`, `useReviseProspectProposal`, `useApproveProspectProposal`, `useDeliverDisclosure`); `ConfirmRecord`; `Attestation`; `DataTable`; `assetClassLabel`; `fmtMoney`, `fmtResult`, `fmtWeight`, `fmtQuantity`, `fmtPoints`, `fmtDate`, `clientRate`, `fmtDayMonthYear`.
- Produces (component props):

```ts
ProspectProposalEmbed({ prospectId: string; proposalId: string; actions?: ReactNode })
ReviseProspectDialog({ open: boolean; onOpenChange: (open: boolean) => void; prospectId: string; detail: ProspectProposalDetail })
ProspectApproval({ detail: ProspectProposalDetail; directory: Directory; onRecorded: (actId: string) => void })
OnboardingChecklist({ view: ProspectView; directory: Directory; canDeliver: boolean; onRecorded: (actId: string) => void })
ProspectWorkPanel({ prospectId: string; directory: Directory; onRecorded: (actId: string) => void })
ProspectAgentControl({ prospectId: string; agent: AgentProfile })
// prospect-words.ts
export const RATIONALE_DRAFT: string
export const TRANCHE_OPTIONS: readonly { value: '' | '2' | '3'; label: string }[]
```

- [ ] **Step 1: Write the failing test**

Create `src/workspace/__tests__/prospect-work.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { store } from '@/mocks/data/workspace-store'
import {
  advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee, reviseProspectProposal, sendProspectProposal,
} from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const embed = () => screen.findByRole('region', { name: 'Proposal · Pell proposal' })

async function replied() {
  await recordCoffee(ADRIAN, PELL, 'Coffee.')
  await advanceProspect(ADRIAN, PELL, 'reply')
}
async function openWork() {
  renderRoutes(routes, '/t/th-pell-work')
  await screen.findByRole('heading', { level: 1, name: 'Pell · prospect work' })
}

describe('the prospect work thread', () => {
  afterEach(() => sessionStorage.clear())

  it('the agents report here, and the Proposal Agent drafts v1 from them', async () => {
    const user = userEvent.setup()
    await replied()
    await openWork()
    expect(screen.getByRole('note', { name: "Visibility: Firm only · prospect can't see" })).toBeInTheDocument()
    const ask = await inContext().findByRole('region', { name: 'Ask an agent' })
    await user.click(within(ask).getByRole('button', { name: 'Ask Prospect Profile' }))
    expect(await conversation().findByRole('article', { name: "Prospect Profile: Dr. Amanda Pell's answers average to a score in the moderate aggressive band." })).toHaveTextContent('66')
    await user.click(within(ask).getByRole('button', { name: 'Ask Transfer-In' }))
    expect(await conversation().findByRole('article', { name: /^Transfer-In: Stryker Corp\. is a concentrated position/ })).toHaveTextContent('481,378')
    await user.click(within(ask).getByRole('button', { name: 'Ask Proposal Agent' }))
    const proposal = await embed()
    expect(within(proposal).getByRole('table', { name: 'Transfer in kind · v1' })).toHaveTextContent('Stryker Corp. (SYK)')
    expect(within(proposal).getByRole('table', { name: 'Model against the transfer · v1' })).toHaveTextContent('US Equity')
    expect(proposal).toHaveTextContent('Growth · Moderate Aggressive · score 66')
    expect(proposal).toHaveTextContent('TIAA 403(b) · 900,000 USD · rollover: asked about; comparison to follow')
    expect(proposal).toHaveTextContent('Prices as of 25 Feb 2026 close.')
    expect(proposal).toHaveTextContent('Not approved')
  })

  it('a revision documents the staged sale; the embed shows v2 with its tranches', async () => {
    const user = userEvent.setup()
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    await openWork()
    const proposal = await embed()
    await user.click(within(proposal).getByRole('button', { name: 'Revise' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revise the Pell proposal' })
    await user.selectOptions(within(dialog).getByLabelText('Staged sale of the concentrated stock'), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Ask for v2' }))
    expect(await within(proposal).findByRole('table', { name: 'Staged sale option · v2' })).toHaveTextContent('2027')
    expect(conversation().getByRole('article', { name: 'v2 · Proposal Agent' })).toHaveTextContent('over two tax years')
  })

  it('approval waits for the attestation and the rationale, files the best-interest record, and opens the rollover follow-up', async () => {
    const user = userEvent.setup()
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    expect(approval).toHaveTextContent('Balanced Growth')
    expect(approval).toHaveTextContent('Staying self-directed')
    expect(approval).toHaveTextContent('Rollover of the former employer 403(b): asked about; comparison to follow.')
    const approve = within(approval).getByRole('button', { name: 'Approve v1' })
    expect(approve).toBeDisabled()
    await user.click(within(approval).getByRole('checkbox', { name: 'I reviewed v1: its model, its transfer plan, its fees and the best-interest record.' }))
    await user.click(approve)
    await user.dblClick(within(await screen.findByRole('dialog', { name: 'Approve v1 of the Pell proposal?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(approval).toHaveTextContent('v1 is approved'))
    expect(store().acts.filter((a) => a.kind === 'approve_proposal')).toHaveLength(1)
    expect(store().acts[0]?.bestInterest?.rationale).toMatch(/^Growth/)
    // Approved on Thu 26 Feb (after her reply): five trading days later is Thu 5 Mar.
    expect(await inContext().findByRole('region', { name: 'Follow-up' })).toHaveTextContent('due 2026-03-05')
  })

  it('an approval of content that moved is refused, and says so', async () => {
    const user = userEvent.setup()
    await replied()
    const created = await createProspectProposal(ADRIAN, PELL)
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    await user.click(within(approval).getByRole('checkbox', { name: /^I reviewed v1/ }))
    await user.click(within(approval).getByRole('button', { name: 'Approve v1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve v1 of the Pell proposal?' })
    await reviseProspectProposal(ADRIAN, PELL, created.id, [{ kind: 'stage_diversification', tranches: 2 }])
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('v2 is newer than v1; review v2 before approving.')
    expect(store().acts.filter((a) => a.kind === 'approve_proposal')).toHaveLength(0)
  })

  it('after her acceptance the checklist names owners, dues and states; ADV 2B is delivered from it', async () => {
    const user = userEvent.setup()
    await replied()
    const created = await createProspectProposal(ADRIAN, PELL)
    await approveProspectProposal(ADRIAN, created.id, 1, created.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
    await deliverDisclosure(ADRIAN, PELL, 'form_crs')
    await sendProspectProposal(ADRIAN, created.id)
    await advanceProspect(ADRIAN, PELL, 'acceptance')
    await openWork()
    const onboarding = await inContext().findByRole('region', { name: 'Onboarding' })
    const table = within(onboarding).getByRole('table', { name: 'Onboarding checklist' })
    expect(table).toHaveTextContent('CIP identity verification')
    expect(table).toHaveTextContent('Trusted contact (FINRA Rule 4512)')
    expect(table).toHaveTextContent('Awaiting her signature')
    expect(table).toHaveTextContent('2026-03-09')
    expect(table).toHaveTextContent('Not started')
    await user.click(within(onboarding).getByRole('button', { name: 'Deliver ADV Part 2B' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Deliver ADV Part 2B to Dr. Amanda Pell?' })).getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(within(onboarding).queryByRole('button', { name: 'Deliver ADV Part 2B' })).toBeNull())
    expect(conversation().getByRole('article', { name: 'Onboarding opened' })).toBeInTheDocument()
  })

  it('Mark reads the approval\'s record but has no approve control', async () => {
    await replied()
    await createProspectProposal(ADRIAN, PELL)
    viewAsOnLoad('cco-001')
    await openWork()
    const approval = await inContext().findByRole('region', { name: 'Approval · Pell proposal' })
    expect(within(approval).queryByRole('button', { name: /^Approve/ })).toBeNull()
    expect(approval).toHaveTextContent('Staying self-directed')
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/workspace/__tests__/prospect-work.test.tsx --testTimeout 30000`
Expected: FAIL — no "Ask Proposal Agent" for a prospect, no embed, no approval region.

- [ ] **Step 3: Words**

Add to `src/workspace/prospect/prospect-words.ts`:

```ts
/** What the presenter starts from when approving; it is Adrian's own reasoning and he may change any of it. */
export const RATIONALE_DRAFT =
  'Growth matches her questionnaire and her long horizon. Her Stryker position moves in kind; any sale is staged with her CPA. The 403(b) stays where it is until the comparison.'

export const TRANCHE_OPTIONS: readonly { value: '' | '2' | '3'; label: string }[] = [
  { value: '', label: 'Not staged' }, { value: '2', label: 'Over two tax years' }, { value: '3', label: 'Over three tax years' },
]
```

- [ ] **Step 4: The embed and its revision**

Create `src/workspace/prospect/ProspectProposalEmbed.tsx`:

```tsx
import { useId, type ReactNode } from 'react'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Tag } from '@/kit/tag/Tag'
import { clientRate, fmtDayMonthYear, fmtMoney, fmtPoints, fmtQuantity, fmtResult, fmtWeight } from '@/kit/measure'
import { useProspectProposals } from '@/hooks/use-prospect-work'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { ProspectProposalDetail, ProspectProposalVersion } from '@/types/workspace-prospect'

type Props = { prospectId: string; proposalId: string; actions?: ReactNode }

function approvalWords(detail: ProspectProposalDetail): string {
  if (detail.accepted) return `Accepted v${detail.accepted.version} (${detail.accepted.actId})`
  if (detail.sent) return `Sent v${detail.sent.version} (${detail.sent.actId})`
  if (detail.approval) return `v${detail.approval.version} approved (${detail.approval.actId})`
  return 'Not approved'
}

/** Her proposal as the thread shows it: always the latest version, every figure the engine's. */
export function ProspectProposalEmbed({ prospectId, proposalId, actions }: Props) {
  const titleId = useId()
  const proposals = useProspectProposals(prospectId)
  if (proposals.isPending) return <p role="status" className="text-body text-ink-3">Loading the proposal…</p>
  if (proposals.isError) return <p role="alert" className="text-body">{proposals.error.message}</p>
  const detail = proposals.data.find((p) => p.id === proposalId)
  if (!detail) throw new Error(`Proposal ${proposalId} is not among her proposals`)
  const v = detail.versions[detail.versions.length - 1]
  if (!v) throw new Error(`Proposal ${proposalId} has no versions`)
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Proposal · ${detail.title}`}</h2>
        <span className="tabular text-label text-ink-3">{`v${v.n}`}</span>
      </div>
      <p className="text-copy">{v.changeSummary}</p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Tag>{approvalWords(detail)}</Tag>
        <span className="tabular text-body">{`${v.modelName} · ${v.profileLabel} · score ${fmtPoints(v.score)}`}</span>
      </div>
      <SleevesTable version={v} />
      <TransferTable version={v} />
      {v.concentration ? (
        <p className="text-body">{`${v.concentration.name} is ${fmtWeight(v.concentration.weightOfAssets)}% of her assets; it moves in kind, and nothing is sold.`}</p>
      ) : null}
      {v.tranches.length > 0 ? <TranchesTable version={v} /> : null}
      {v.heldAway.map((h) => (
        <p key={h.statementId} className="tabular text-body">{`${h.custodian} 403(b) · ${fmtMoney(h.value)} USD · rollover: asked about; comparison to follow`}</p>
      ))}
      <p className="tabular text-body">{`Fees · ${v.fees.scheduleName} · ${fmtMoney(v.fees.annual)} USD a year on ${fmtMoney(v.fees.base)} USD · blended ${clientRate(v.fees.blendedRate)}`}</p>
      <p className="text-label normal-case text-ink-3">{`Prices as of ${fmtDayMonthYear(v.pricesAsOf)} close. Tax figures are estimates at the top federal rate; state tax is not modelled; consult your tax professional.`}</p>
      <ol aria-label="Versions" className="flex flex-col gap-1">
        {detail.versions.map((x) => <li key={x.n} className="tabular text-label text-ink-3">{`v${x.n} · fingerprint ${x.fingerprint}`}</li>)}
      </ol>
      {actions ? <div className="flex flex-wrap items-center gap-4">{actions}</div> : null}
    </section>
  )
}

function SleevesTable({ version }: { version: ProspectProposalVersion }) {
  return (
    <DataTable caption={`Model against the transfer · v${version.n}`} rows={version.sleeves} getRowId={(s) => s.assetClass} noun={{ singular: 'asset class', plural: 'asset classes' }} density="dense"
      columns={[
        { id: 'class', header: 'Asset class', cell: (s) => assetClassLabel(s.assetClass) },
        { id: 'target', header: 'Model', unit: '%', align: 'right', cell: (s) => <Num text={fmtWeight(s.target)} /> },
        { id: 'transferred', header: 'As transferred', unit: '%', align: 'right', cell: (s) => <Num text={fmtWeight(s.transferred)} /> },
      ]} />
  )
}

function TransferTable({ version }: { version: ProspectProposalVersion }) {
  return (
    <DataTable caption={`Transfer in kind · v${version.n}`} rows={version.transfer} getRowId={(l) => l.symbol} noun={{ singular: 'holding', plural: 'holdings' }} density="dense"
      columns={[
        { id: 'holding', header: 'Holding', wrap: true, cell: (l) => `${l.name} (${l.symbol})` },
        { id: 'shares', header: 'Shares', unit: 'sh', align: 'right', cell: (l) => <Num text={fmtQuantity(l.quantity)} /> },
        { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.marketValue)} /> },
        { id: 'unrealised', header: 'Unrealised', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtResult(l.unrealised)} /> },
        { id: 'tax', header: 'Tax if sold now', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.taxIfSoldNow)} /> },
        { id: 'plan', header: 'Plan', cell: () => 'In kind' },
      ]} />
  )
}

function TranchesTable({ version }: { version: ProspectProposalVersion }) {
  return (
    <div className="flex flex-col gap-2">
      <DataTable caption={`Staged sale option · v${version.n}`} rows={version.tranches} getRowId={(t) => String(t.n)} noun={{ singular: 'tranche', plural: 'tranches' }} density="dense"
        columns={[
          { id: 'year', header: 'Tax year', cell: (t) => String(t.taxYear) },
          { id: 'shares', header: 'Shares', unit: 'sh', align: 'right', cell: (t) => <Num text={fmtQuantity(t.shares)} /> },
          { id: 'gain', header: 'Gain', unit: 'USD', align: 'right', cell: (t) => <Num text={fmtResult(t.gain)} /> },
          { id: 'tax', header: 'Tax estimate', unit: 'USD', align: 'right', cell: (t) => <Num text={fmtMoney(t.tax)} /> },
        ]} />
      <p className="text-label normal-case text-ink-3">An option to decide with her CPA; nothing is sold.</p>
    </div>
  )
}
```

Create `src/workspace/prospect/ReviseProspectDialog.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { Select } from '@/kit/select/Select'
import { useReviseProspectProposal } from '@/hooks/use-prospect-work'
import type { ProspectConstraint, ProspectProposalDetail } from '@/types/workspace-prospect'
import { TRANCHE_OPTIONS } from './prospect-words'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; prospectId: string; detail: ProspectProposalDetail }

const constraintsFor = (value: string): ProspectConstraint[] =>
  value === '2' || value === '3' ? [{ kind: 'stage_diversification', tranches: value === '2' ? 2 : 3 }] : []

/** Asks the Proposal Agent for the next version under the chosen staging. The form starts from the latest version each time it opens. */
export function ReviseProspectDialog({ open, onOpenChange, prospectId, detail }: Props) {
  const revise = useReviseProspectProposal(prospectId)
  const latest = detail.versions[detail.versions.length - 1]
  const staged = latest?.constraints.find((c) => c.kind === 'stage_diversification')
  const [value, setValue] = useState<string>(staged ? String(staged.tranches) : '')
  if (!latest) throw new Error(`Proposal ${detail.id} has no versions`)
  const ask = () => revise.mutate({ proposalId: detail.id, constraints: constraintsFor(value) }, { onSuccess: () => onOpenChange(false) })
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!revise.isPending) onOpenChange(next) }} title={`Revise the ${detail.title}`}
      description="The Proposal Agent drafts a new version; nothing is sold in any version.">
      <div className="flex flex-col gap-4">
        <Select label="Staged sale of the concentrated stock" layout="stacked" value={value} onChange={setValue} options={TRANCHE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
        <div className="flex justify-end gap-3">
          <Button rank="secondary" disabled={revise.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={revise.isPending} onClick={ask}>{`Ask for v${latest.n + 1}`}</Button>
        </div>
      </div>
    </Dialog>
  )
}
```

In `src/workspace/thread/MessageView.tsx` replace the Task 3 `prospect_proposal` case with:

```tsx
    case 'prospect_proposal': {
      const agent = directory.agents.find((a) => a.id === message.agentId)
      if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
      if (thread.subject?.type !== 'prospect') throw new Error(`Prospect proposal ${message.proposalId} sits outside a prospect thread`)
      const actions = canPostIn(thread, viewerId, directory) ? <ReviseProspectAction prospectId={thread.subject.id} proposalId={message.proposalId} /> : undefined
      return <ByAgent name={agent.name} at={message.at}><ProspectProposalEmbed prospectId={thread.subject.id} proposalId={message.proposalId} actions={actions} /></ByAgent>
    }
```

(imports: `ProspectProposalEmbed` and `ReviseProspectDialog` from `@/workspace/prospect/…`, `useProspectProposals` from `@/hooks/use-prospect-work`) and add, beside `ReviseAction`:

```tsx
/** Mounts the dialog only while open, so it starts from the latest version; gone once the proposal is sent. */
function ReviseProspectAction({ prospectId, proposalId }: { prospectId: string; proposalId: string }) {
  const [open, setOpen] = useState(false)
  const proposals = useProspectProposals(prospectId)
  const detail = proposals.data?.find((p) => p.id === proposalId)
  if (!detail || detail.sent) return null
  return (
    <>
      <Button rank="secondary" onClick={() => setOpen(true)}>Revise</Button>
      {open ? <ReviseProspectDialog open={open} onOpenChange={setOpen} prospectId={prospectId} detail={detail} /> : null}
    </>
  )
}
```

- [ ] **Step 5: The approval, the follow-up, the checklist**

Create `src/workspace/prospect/ProspectApproval.tsx`:

```tsx
import { useId, useState } from 'react'
import { Attestation } from '@/kit/attestation/Attestation'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { clientRate, fmtMoney, fmtWeight } from '@/kit/measure'
import { useApproveProspectProposal } from '@/hooks/use-prospect-work'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import type { Directory } from '@/types/workspace'
import type { ProspectProposalDetail } from '@/types/workspace-prospect'
import { RATIONALE_DRAFT } from './prospect-words'

type Props = { detail: ProspectProposalDetail; directory: Directory; onRecorded: (actId: string) => void }

/** Approval of one exact version, with the firm-only best-interest record the engine composes and the advisor's own reasons. */
export function ProspectApproval({ detail, directory, onRecorded }: Props) {
  const { viewerId } = useViewer()
  const approve = useApproveProspectProposal()
  const titleId = useId()
  const attestId = useId()
  const [attestedVersion, setAttestedVersion] = useState<number>()
  const [rationale, setRationale] = useState(RATIONALE_DRAFT)
  const [confirming, setConfirming] = useState(false)
  const latest = detail.versions[detail.versions.length - 1]
  if (!latest) throw new Error(`Proposal ${detail.id} has no versions`)
  const draft = detail.bestInterestDraft
  const canApprove = (directory.permissions[viewerId] ?? []).includes('approve_proposal') && !detail.sent && detail.approval?.version !== latest.n
  const blocked = attestedVersion !== latest.n ? `Tick the review of v${latest.n} first.` : rationale.trim().length === 0 ? 'Say why, in your own words.' : undefined
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <h2 id={titleId} className="text-label uppercase text-ink-2">{`Approval · ${detail.title}`}</h2>
      {detail.approval ? <p className="tabular text-body">{`v${detail.approval.version} is approved (${detail.approval.actId}).`}</p> : null}
      {detail.approval && detail.approval.version !== latest.n ? <p className="text-body">{`v${latest.n} is newer and not approved.`}</p> : null}
      <div className="flex flex-col gap-2 border-l-2 border-rule-2 pl-3">
        <p className="text-label uppercase text-ink-3">Best-interest record · firm only</p>
        <p className="tabular text-body">{`${draft.modelName} for the ${draft.profileLabel} band (score ${draft.score}).`}</p>
        <ul aria-label="Alternatives considered" className="flex flex-col gap-2">
          {draft.alternatives.map((a) => (
            <li key={a.kind} className="flex flex-col gap-0.5">
              <span className="tabular text-body font-semibold">{`${a.name} · ${fmtMoney(a.annualFee)} USD a year`}</span>
              <span className="text-body text-ink-2">{a.why}</span>
            </li>
          ))}
        </ul>
        <p className="tabular text-body">{`Costs · ${draft.costs.scheduleName} · ${fmtMoney(draft.costs.annualFee)} USD a year · blended ${clientRate(draft.costs.blendedRate)}`}</p>
        {draft.concentration ? <p className="tabular text-body">{`Concentration · ${draft.concentration.name} · ${fmtWeight(draft.concentration.weightOfAssets)}% of her assets · tax if sold now ${fmtMoney(draft.concentration.taxIfSoldNow)} USD (estimate)`}</p> : null}
        <p className="text-body">{draft.rollover}</p>
      </div>
      {canApprove ? (
        <>
          <TextInput label="Why this recommendation (your words)" value={rationale} onChange={setRationale} rows={4} />
          <Attestation id={attestId} checked={attestedVersion === latest.n} onChange={(checked) => setAttestedVersion(checked ? latest.n : undefined)}>
            {`I reviewed v${latest.n}: its model, its transfer plan, its fees and the best-interest record.`}
          </Attestation>
          <Button className="self-start" disabled={blocked !== undefined} onClick={() => { approve.reset(); setConfirming(true) }}>{`Approve v${latest.n}`}</Button>
          {blocked ? <p className="text-label text-ink-3">{blocked}</p> : null}
          <ConfirmRecord open={confirming} onClose={() => setConfirming(false)} mutation={approve}
            variables={{ proposalId: detail.id, version: latest.n, fingerprint: latest.fingerprint, rationale }}
            onRecorded={(actId) => { setAttestedVersion(undefined); onRecorded(actId) }}
            title={`Approve v${latest.n} of the ${detail.title}?`} description="Approval is a binding act; the best-interest record is filed with it, firm only." />
        </>
      ) : null}
    </section>
  )
}
```

Create `src/workspace/prospect/OnboardingChecklist.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { DataTable } from '@/kit/data-table/DataTable'
import { NotApplicable } from '@/kit/data-table/NotApplicable'
import { Tag } from '@/kit/tag/Tag'
import { fmtDate } from '@/kit/measure'
import { useDeliverDisclosure } from '@/hooks/use-prospect-work'
import { personIn } from '@/workspace/people/directory-people'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import type { Directory } from '@/types/workspace'
import type { DisclosureDocument, ProspectView } from '@/types/workspace-prospect'
import { DISCLOSURE_SHORT, ONBOARDING_STATUS_WORDS } from './prospect-words'

type Props = { view: ProspectView; directory: Directory; canDeliver: boolean; onRecorded: (actId: string) => void }

const AT_ONBOARDING: readonly DisclosureDocument[] = ['adv_2b', 'privacy_notice']

/** The onboarding her acceptance opened: each item, its owner, its trading-day due date and where it stands; the deliveries it waits for. */
export function OnboardingChecklist({ view, directory, canDeliver, onRecorded }: Props) {
  const deliver = useDeliverDisclosure(view.id)
  const [confirming, setConfirming] = useState<DisclosureDocument>()
  const onboarding = view.onboarding
  if (!onboarding) return null
  const deliverable = canDeliver ? AT_ONBOARDING.filter((d) => view.deliverable.includes(d)) : []
  return (
    <div className="flex flex-col gap-3">
      <DataTable caption="Onboarding checklist" rows={onboarding.items} getRowId={(i) => i.id} noun={{ singular: 'item', plural: 'items' }} density="dense"
        columns={[
          { id: 'item', header: 'Item', wrap: true, cell: (i) => i.label },
          { id: 'status', header: 'State', cell: (i) => <Tag tone={i.status === 'delivered' ? 'solid' : 'outline'}>{ONBOARDING_STATUS_WORDS[i.status]}</Tag> },
          { id: 'owner', header: 'Owner', cell: (i) => personIn(directory, i.ownerId).name },
          { id: 'due', header: 'Due', cell: (i) => (i.due ? <span className="tabular">{fmtDate(i.due)}</span> : <NotApplicable />), sortValue: (i) => i.due ?? '' },
        ]} />
      {deliverable.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {deliverable.map((d) => <Button key={d} rank="secondary" onClick={() => { deliver.reset(); setConfirming(d) }}>{`Deliver ${DISCLOSURE_SHORT[d]}`}</Button>)}
        </div>
      ) : null}
      {confirming ? (
        <ConfirmRecord open onClose={() => setConfirming(undefined)} mutation={deliver} variables={confirming} onRecorded={onRecorded}
          title={`Deliver ${DISCLOSURE_SHORT[confirming]} to ${view.name}?`} description="Delivery is a binding act: the record names you, the document and the time." />
      ) : null}
    </div>
  )
}
```

Create `src/workspace/prospect/ProspectWorkPanel.tsx`:

```tsx
import { fmtDate } from '@/kit/measure'
import { useProspect } from '@/hooks/use-prospect-work'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { personIn } from '@/workspace/people/directory-people'
import { ContextSection } from '@/workspace/context/ContextSection'
import type { Directory } from '@/types/workspace'
import { OnboardingChecklist } from './OnboardingChecklist'
import { ProspectApproval } from './ProspectApproval'

type Props = { prospectId: string; directory: Directory; onRecorded: (actId: string) => void }

/** The internal thread's context: the approval with its best-interest record, the follow-ups, and the onboarding checklist. */
export function ProspectWorkPanel({ prospectId, directory, onRecorded }: Props) {
  const { viewerId } = useViewer()
  const prospect = useProspect(prospectId)
  if (prospect.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the prospect…</p>
  if (prospect.isError) return <p role="alert" className="py-5 text-body">{prospect.error.message}</p>
  const view = prospect.data
  const canDeliver = (directory.permissions[viewerId] ?? []).includes('deliver_disclosure')
  return (
    <>
      {view.proposals.map((p) => <ProspectApproval key={p.id} detail={p} directory={directory} onRecorded={onRecorded} />)}
      {view.tasks.length > 0 ? (
        <ContextSection title="Follow-up">
          <ul className="flex flex-col gap-1.5">
            {view.tasks.map((t) => <li key={t.id} className="tabular text-body">{`${t.text} · ${personIn(directory, t.ownerId).name} · due ${fmtDate(t.due)}`}</li>)}
          </ul>
        </ContextSection>
      ) : null}
      {view.onboarding ? (
        <ContextSection title="Onboarding">
          <OnboardingChecklist view={view} directory={directory} canDeliver={canDeliver} onRecorded={onRecorded} />
        </ContextSection>
      ) : null}
    </>
  )
}
```

Create `src/workspace/prospect/ProspectAgentControl.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useCreateProspectProposal } from '@/hooks/use-prospect-work'
import type { AgentProfile } from '@/types/workspace'

/** Asks the Proposal Agent for her proposal; the engine returns the existing one rather than drafting twice. */
export function ProspectAgentControl({ prospectId, agent }: { prospectId: string; agent: AgentProfile }) {
  const create = useCreateProspectProposal(prospectId)
  const [report, setReport] = useState<string>()
  const ask = () => {
    setReport(undefined)
    create.mutate(undefined, {
      onSuccess: (detail) => setReport(detail.versions.length === 1 ? `${agent.name} posted v1 in the thread.` : `${agent.name} has already drafted this proposal; v${detail.versions.length} is in the thread.`),
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

In `src/workspace/context/AskAgents.tsx`:

```tsx
  const drafting = canPost && thread.subject?.type === 'account' ? agents.filter((a) => a.produces === 'proposals') : []
  const prospectId = canPost && thread.subject?.type === 'prospect' ? thread.subject.id : undefined
  const draftingForProspect = prospectId ? agents.filter((a) => a.produces === 'proposals') : []
  …
  if (runnable.length === 0 && drafting.length === 0 && draftingForProspect.length === 0) return null
  …
      {drafting.map((a) => <ProposalAgentControl key={a.id} thread={thread} agent={a} />)}
      {prospectId ? draftingForProspect.map((a) => <ProspectAgentControl key={a.id} prospectId={prospectId} agent={a} />) : null}
```

In `src/workspace/context/ContextColumn.tsx`, after the `MeetingPanel` line:

```tsx
      {t.visibility === 'internal' && t.subject?.type === 'prospect' && !viewerIsExternal
        ? <ProspectWorkPanel prospectId={t.subject.id} directory={dir} onRecorded={setSentActId} /> : null}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/prospect-work.test.tsx src/workspace/__tests__/proposal-thread.test.tsx src/workspace/__tests__/context.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(prospects): the prospect work thread — the agents, the proposal embed and its revision, approval with the best-interest record, the onboarding checklist

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 12: The prospect page, its ways in, and the command line

`/prospects/:prospectId` is a firm-only full view of her: profile, stage history, disclosures with timestamps and records, the questionnaire result and its model mapping, the transfer-in summary, the proposal and its versions, the follow-up and the onboarding checklist. It is reached from the command line ("Prospect · Dr. Amanda Pell") and from both her threads' "Full views". An outsider is told it does not exist; a switch of "View as" to her goes home.

**Files:**
- Create: `src/workspace/prospect/ProspectPage.tsx`, `src/workspace/__tests__/prospect-page.test.tsx`
- Modify: `src/app/routes.tsx`, `src/workspace/full-views/full-view-href.ts`, `src/workspace/context/FullViews.tsx`, `src/app/use-destinations.ts`, `src/workspace/__tests__/shell-keyboard.test.tsx:51-62`

**Interfaces:**
- Consumes: `useProspect`, `useProspects` (Task 9); `OnboardingChecklist` (Task 11); `FullViewNotFound`, `useGoHomeWhenHidden`, `isNotFound`.
- Produces:

```ts
// src/workspace/full-views/full-view-href.ts
export const prospectFullViewHref: (prospectId: string, fromThreadId?: string) => string   // "/prospects/prsp-011?from=th-pell"
// routes: { path: 'prospects/:prospectId', element: <ProspectPage />, handle: fullWidthHandle }
// command line: 'Prospect · <name>' (aliases ['prospect']) for each prospect a firm viewer may read, after the meetings
```

- [ ] **Step 1: Write the failing test**

Create `src/workspace/__tests__/prospect-page.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee } from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

async function through() {
  await deliverDisclosure(ADRIAN, PELL, 'form_crs')
  await recordCoffee(ADRIAN, PELL, 'Coffee.')
  await advanceProspect(ADRIAN, PELL, 'reply')
  const p = await createProspectProposal(ADRIAN, PELL)
  await approveProspectProposal(ADRIAN, p.id, 1, p.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
}

describe('the prospect page', () => {
  afterEach(() => sessionStorage.clear())

  it('states her stage, disclosures, profile, transfer and versions, firm only', async () => {
    await through()
    renderRoutes(routes, '/prospects/prsp-011?from=th-pell')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dr. Amanda Pell' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(within(main).getByRole('note', { name: "Visibility: Firm only · prospect can't see" })).toBeInTheDocument()
    expect(within(main).getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-pell')
    expect(within(main).getByRole('list', { name: 'Stage history' })).toHaveTextContent('Discovery')
    expect(within(main).getByRole('table', { name: 'Disclosures delivered' })).toHaveTextContent('REC-0001')
    expect(main).toHaveTextContent('Score 66 · Moderate Aggressive band (56–75) · Growth')
    expect(within(main).getByRole('table', { name: 'Transfer summary' })).toHaveTextContent('Stryker Corp. (SYK)')
    expect(within(main).getByRole('table', { name: 'Versions · Pell proposal' })).toHaveTextContent('Approved')
    expect(main).toHaveTextContent('Prices as of 25 Feb 2026 close.')
  })

  it('is not found for her and for Robert', async () => {
    for (const viewer of [PELL, 'cli-001']) {
      viewAsOnLoad(viewer)
      const { unmount } = renderRoutes(routes, '/prospects/prsp-011')
      expect(await screen.findByRole('heading', { level: 1, name: 'Prospect not found' })).toBeInTheDocument()
      unmount()
    }
  })

  it('both her threads open it from Full views', async () => {
    renderRoutes(routes, '/t/th-pell-work')
    const views = await screen.findByRole('region', { name: 'Full views' })
    expect(await within(views).findByRole('link', { name: /Dr\. Amanda Pell/ })).toHaveAttribute('href', '/prospects/prsp-011?from=th-pell-work')
  })
})
```

In `src/workspace/__tests__/shell-keyboard.test.tsx:61`, after `'Meeting · Johnson annual review',` add `'Prospect · Dr. Amanda Pell',`.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/workspace/__tests__/prospect-page.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx --testTimeout 30000`
Expected: FAIL — `/prospects/prsp-011` falls through to not found.

- [ ] **Step 3: The page**

Add to `src/workspace/full-views/full-view-href.ts`:

```ts
export const prospectFullViewHref = (prospectId: string, fromThreadId?: string) => withFrom(`/prospects/${encodeURIComponent(prospectId)}`, fromThreadId)
```

Create `src/workspace/prospect/ProspectPage.tsx`:

```tsx
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { fmtDate, fmtDayMonthYear, fmtMoney, fmtPoints, fmtQuantity, fmtResult, fmtTimestamp } from '@/kit/measure'
import { useDirectory } from '@/hooks/use-workspace'
import { useProspect } from '@/hooks/use-prospect-work'
import { isNotFound } from '@/workspace/is-not-found'
import { personIn } from '@/workspace/people/directory-people'
import { authorName } from '@/workspace/proposal/author-name'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import type { Directory } from '@/types/workspace'
import { DISCLOSURE_TITLES, type ProspectProposalDetail, type ProspectProposalVersion, type ProspectView } from '@/types/workspace-prospect'
import { OnboardingChecklist } from './OnboardingChecklist'
import { STAGE_WORDS } from './prospect-words'

const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

export function ProspectPage() {
  const { prospectId } = useParams()
  if (!prospectId) throw new Error('The prospect route needs a prospect id')
  return <ProspectGate key={prospectId} prospectId={prospectId} />
}

/** Firm-only: an outsider is told the prospect is not found, and a switch of "View as" to one goes home. */
function ProspectGate({ prospectId }: { prospectId: string }) {
  const prospect = useProspect(prospectId)
  const directory = useDirectory()
  const hiddenFromNewViewer = useGoHomeWhenHidden(prospect)
  if (hiddenFromNewViewer || prospect.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the prospect…</p>
  if (prospect.isError) return isNotFound(prospect.error) ? <FullViewNotFound subject="Prospect" /> : <p role="alert" className="text-body">{prospect.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <ProspectRecordPage view={prospect.data} directory={directory.data} />
}

function versionState(detail: ProspectProposalDetail, v: ProspectProposalVersion): string {
  if (detail.accepted?.version === v.n) return 'Accepted'
  if (detail.sent?.version === v.n) return 'Sent'
  if (detail.approval?.version === v.n) return 'Approved'
  return '—'
}

function ProspectRecordPage({ view, directory }: { view: ProspectView; directory: Directory }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={LINK}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" party="prospect" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{view.name}</h1>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Tag tone="solid">{STAGE_WORDS[view.stage]}</Tag>
          {view.referrerName ? <span className="text-body text-ink-2">{`Referred by ${view.referrerName}`}</span> : null}
          <Link to={`/t/${encodeURIComponent(view.threadId)}`} className={LINK}>Her thread</Link>
          <Link to={`/t/${encodeURIComponent(view.internalThreadId)}`} className={LINK}>Prospect work</Link>
        </div>
      </header>
      <Pane title="Stage">
        <ol aria-label="Stage history" className="flex flex-col gap-1">
          {view.stageHistory.map((h) => <li key={`${h.stage}-${h.at}`} className="tabular text-body">{`${STAGE_WORDS[h.stage]} · ${fmtTimestamp(h.at)}`}</li>)}
        </ol>
      </Pane>
      <Pane title="Disclosures">
        <DataTable caption="Disclosures delivered" rows={view.disclosures} getRowId={(d) => d.document} noun={{ singular: 'disclosure', plural: 'disclosures' }} density="dense"
          columns={[
            { id: 'document', header: 'Document', wrap: true, cell: (d) => DISCLOSURE_TITLES[d.document] },
            { id: 'at', header: 'Delivered', cell: (d) => <span className="tabular">{fmtTimestamp(d.at)}</span>, sortValue: (d) => d.at },
            { id: 'record', header: 'Record', cell: (d) => <span className="tabular">{d.actId}</span> },
            { id: 'by', header: 'By', cell: (d) => personIn(directory, d.deliveredBy).name },
          ]} />
      </Pane>
      <Pane title="Questionnaire and model">
        {view.profile && view.questionnaire ? (
          <p className="tabular text-body">{`Score ${fmtPoints(view.profile.score)} · ${view.profile.profileLabel} band (${view.profile.floor}–${view.profile.ceiling}) · ${view.profile.modelName} · answered ${fmtTimestamp(view.questionnaire.receivedAt)}`}</p>
        ) : <p className="text-body text-ink-2">Her questionnaire is not on file yet.</p>}
      </Pane>
      <Pane title="Transfer">
        {view.transfer ? (
          <div className="flex flex-col gap-2">
            <DataTable caption="Transfer summary" rows={view.transfer.lines} getRowId={(l) => l.symbol} noun={{ singular: 'holding', plural: 'holdings' }} density="dense"
              columns={[
                { id: 'holding', header: 'Holding', wrap: true, cell: (l) => `${l.name} (${l.symbol})` },
                { id: 'shares', header: 'Shares', unit: 'sh', align: 'right', cell: (l) => <Num text={fmtQuantity(l.quantity)} /> },
                { id: 'value', header: 'Value', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.marketValue)} /> },
                { id: 'unrealised', header: 'Unrealised', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtResult(l.unrealised)} /> },
                { id: 'tax', header: 'Tax if sold now', unit: 'USD', align: 'right', cell: (l) => <Num text={fmtMoney(l.taxIfSoldNow)} /> },
              ]} />
            <p className="tabular text-body">{`Transfers ${fmtMoney(view.transfer.transferValue)} USD of ${fmtMoney(view.transfer.totalAssets)} USD; the 403(b) stays held away (rollover: asked about; comparison to follow).`}</p>
            <p className="text-label normal-case text-ink-3">{`Prices as of ${fmtDayMonthYear(view.transfer.pricesAsOf)} close. Tax figures are estimates; state tax is not modelled; consult your tax professional.`}</p>
          </div>
        ) : <p className="text-body text-ink-2">Her statements are not on file yet.</p>}
      </Pane>
      <Pane title="Proposal">
        {view.proposals.length === 0 ? <p className="text-body text-ink-2">No proposal yet.</p> : view.proposals.map((p) => (
          <DataTable key={p.id} caption={`Versions · ${p.title}`} rows={p.versions} getRowId={(v) => String(v.n)} noun={{ singular: 'version', plural: 'versions' }} density="dense"
            columns={[
              { id: 'n', header: 'Version', cell: (v) => <span className="tabular">{`v${v.n}`}</span>, sortValue: (v) => v.n },
              { id: 'author', header: 'Author', cell: (v) => authorName(v.author, directory) },
              { id: 'created', header: 'Created', cell: (v) => <span className="tabular">{fmtTimestamp(v.createdAt)}</span> },
              { id: 'change', header: 'Change', wrap: true, cell: (v) => v.changeSummary },
              { id: 'fingerprint', header: 'Fingerprint', cell: (v) => <span className="tabular">{v.fingerprint}</span> },
              { id: 'state', header: 'State', cell: (v) => versionState(p, v) },
            ]} />
        ))}
      </Pane>
      {view.tasks.length > 0 ? (
        <Pane title="Follow-up">
          <ul className="flex flex-col gap-1">{view.tasks.map((t) => <li key={t.id} className="tabular text-body">{`${t.text} · ${personIn(directory, t.ownerId).name} · due ${fmtDate(t.due)}`}</li>)}</ul>
        </Pane>
      ) : null}
      {view.onboarding ? (
        <Pane title="Onboarding">
          <OnboardingChecklist view={view} directory={directory} canDeliver={false} onRecorded={() => undefined} />
        </Pane>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: The ways in**

In `src/app/routes.tsx`: import `ProspectPage` and add `{ path: 'prospects/:prospectId', element: <ProspectPage />, handle: fullWidthHandle },` after the meetings route.

In `src/workspace/context/FullViews.tsx` add `case 'prospect': return <ProspectViews prospectId={subject.id} threadId={threadId} />` and:

```tsx
function ProspectViews({ prospectId, threadId }: { prospectId: string; threadId: string }) {
  const prospect = useProspect(prospectId)
  return (
    <ContextSection title="Full views">
      {prospect.isPending ? <p role="status" className="text-body text-ink-3">Loading the prospect…</p>
        : prospect.isError ? <p role="alert" className="text-body">{prospect.error.message}</p>
        : <FullViewLink to={prospectFullViewHref(prospectId, threadId)}>{prospect.data.name}</FullViewLink>}
    </ContextSection>
  )
}
```

In `src/app/use-destinations.ts`: `const prospects = useProspects(firmViewer).data ?? []`, and after the meetings entry:

```ts
    ...prospects.map((p) => ({ id: `prospect-${p.id}`, label: `Prospect · ${p.name}`, aliases: ['prospect'], run: () => navigate(prospectFullViewHref(p.id)) })),
```

and the doc comment's list gains "each prospect".

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/workspace/__tests__/prospect-page.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx src/app/__tests__/routes.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(prospects): the prospect page, from the command line and both her threads

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 13: Archive and Supervision for prospect work

The books and the queue name parties, not only clients: every prospect act (deliveries, approval with its best-interest record, the send, her acceptance) is in the Archive under "Dr. Amanda Pell"; the sent proposal is in Mark's correspondence queue with where it came from; the queue's "disposed today" reads the session day, so a review after a clock jump is listed; the presenter's path is named in the record.

**Files:**
- Create: `src/mocks/workspace/__tests__/prospect-supervision.test.ts`, `src/workspace/__tests__/prospect-archive.test.tsx`
- Modify: `src/types/workspace-supervision.ts` (`ArchiveEntry`, `ArchiveFilters`, `Archive`, `CorrespondenceItem`), `src/mocks/workspace/archive.ts`, `src/mocks/workspace/supervision.ts`, `src/mocks/handlers/workspace-supervision.ts` (archive filter parsing), `src/workspace/archive/archive-filters.ts`, `src/workspace/archive/ArchivePage.tsx`, `src/workspace/archive/ArchiveTable.tsx`, `src/workspace/supervision/CorrespondenceEvidence.tsx`, `src/workspace/context/draft-origin.ts`, `src/workspace/prospect/prospect-words.ts` (`PATH_NOTE`), and the tests that read the renamed fields (`src/mocks/workspace/__tests__/archive.test.ts:25,27,34,35`, `src/mocks/handlers/__tests__/workspace-supervision-api.test.ts:35`, `src/workspace/__tests__/archive.test.tsx:48,50`)

**Interfaces:**
- Consumes: `partyOf` (Task 2), `prospectProposalById` (Task 6), `sessionNow`.
- Produces:

```ts
// src/types/workspace-supervision.ts (changed)
export type ArchiveEntry =
  | { kind: 'act'; id: string; at: string; act: BindingAct; partyId?: string; partyName?: string; threadId?: string; threadTitle?: string }
  | { kind: 'sent_message'; id: string; at: string; message: TextMessage; actId: string; fingerprint: string; partyId: string; partyName: string; threadId: string; threadTitle: string }
export type ArchiveFilters = { partyId?: string; kind?: ArchiveKind; from?: string; to?: string }
export type Archive = { entries: ArchiveEntry[]; parties: { id: string; name: string }[]; dates: string[] }
// CorrespondenceItem: clientId/clientName → partyId/partyName, plus partyKind: PartyKind
// src/workspace/prospect/prospect-words.ts
export const PATH_NOTE: Readonly<Record<PresenterPath, string>>   // the archive's short form
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/prospect-supervision.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { requireProspect } from '../prospects'
import { createProspectProposal } from '../prospect-proposals'
import { approveProspectProposal, sendProspectProposal } from '../prospect-acts'
import { advanceProspect, recordCoffee } from '../prospect-steps'
import { reviewCorrespondence } from '../compliance-acts'
import { archiveFor } from '../archive'
import { supervisionQueue } from '../supervision'
import { ADRIAN, withFormCrs } from './prospect-fixture'

const MARK = 'cco-001'
function throughAcceptance() {
  const ok = <T extends { ok: boolean }>(r: T) => { if (!r.ok) throw new Error(JSON.stringify(r)); return r as Extract<T, { ok: true }> }
  ok(recordCoffee(ADRIAN, 'prsp-011', 'Coffee.'))
  ok(advanceProspect(ADRIAN, 'prsp-011', 'reply'))
  const detail = ok(createProspectProposal(ADRIAN, 'prsp-011')).detail
  ok(approveProspectProposal(ADRIAN, detail.id, 1, detail.versions[0]?.fingerprint ?? '', 'Growth fits her answers.'))
  withFormCrs()
  const send = ok(sendProspectProposal(ADRIAN, detail.id)).act
  ok(advanceProspect(ADRIAN, 'prsp-011', 'acceptance'))
  return { detail, send }
}

describe('prospect work in the books', () => {
  it('files every prospect act under her name, and the sent proposal as a sent message', () => {
    throughAcceptance()
    const archive = archiveFor(MARK, { partyId: 'prsp-011' })
    expect(archive?.entries.map((e) => (e.kind === 'act' ? e.act.kind : e.kind))).toEqual([
      'approve_proposal', 'deliver_disclosure', 'send_to_party', 'sent_message', 'accept_proposal',
    ])
    expect(archive?.entries.every((e) => e.partyName === 'Dr. Amanda Pell')).toBe(true)
    expect(archive?.parties).toContainEqual({ id: 'prsp-011', name: 'Dr. Amanda Pell' })
    const accept = archive?.entries.find((e) => e.kind === 'act' && e.act.kind === 'accept_proposal')
    expect(accept?.kind === 'act' && accept.act.viaPresenter).toEqual({ presenterId: ADRIAN, path: 'scripted' })
  })

  it('Mark reviews the sent proposal after the jump to Monday, and it is listed as disposed today', () => {
    const { send } = throughAcceptance()
    const queue = supervisionQueue(MARK)
    const item = queue?.correspondence.find((c) => c.id === send.messageId)
    expect(item).toMatchObject({ partyId: 'prsp-011', partyName: 'Dr. Amanda Pell', partyKind: 'prospect', title: 'Message to Dr. Amanda Pell' })
    const review = reviewCorrespondence(MARK, send.messageId ?? '', 'reviewed', send.fingerprint, 'Reviewed the proposal as she received it, with ADV 2A delivered in the same record.')
    if (!review.ok) throw new Error(review.message)
    expect(review.act.at.startsWith('2026-03-02')).toBe(true)
    expect(review.act.summary).toBe('Reviewed the message sent to Dr. Amanda Pell')
    expect(supervisionQueue(MARK)?.disposedToday.map((d) => d.act.id)).toEqual([review.act.id])
    expect(requireProspect('prsp-011').stage).toBe('onboarding')
  })
})
```

Create `src/workspace/__tests__/prospect-archive.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import {
  advanceProspect, approveProspectProposal, createProspectProposal, deliverDisclosure, recordCoffee, sendProspectProposal,
} from '@/services/workspace'

const ADRIAN = 'user-001'
const PELL = 'prsp-011'

async function sent() {
  await recordCoffee(ADRIAN, PELL, 'Coffee.')
  await advanceProspect(ADRIAN, PELL, 'reply')
  const p = await createProspectProposal(ADRIAN, PELL)
  await approveProspectProposal(ADRIAN, p.id, 1, p.versions[0]?.fingerprint ?? '', 'Growth fits her answers.')
  await deliverDisclosure(ADRIAN, PELL, 'form_crs')
  return sendProspectProposal(ADRIAN, p.id)
}

describe('Mark, on prospect work', () => {
  afterEach(() => sessionStorage.clear())

  it('the Archive filters by party and names her, with the presenter\'s path', async () => {
    await sent()
    await advanceProspect(ADRIAN, PELL, 'acceptance')
    sessionStorage.setItem('ws-viewer', 'cco-001')
    renderRoutes(routes, '/archive?partyId=prsp-011')
    const table = await screen.findByRole('table', { name: 'Archive' })
    expect(screen.getByLabelText('Client or prospect')).toHaveValue('prsp-011')
    expect(table).toHaveTextContent('Delivered Form CRS (client relationship summary) to Dr. Amanda Pell')
    expect(table).toHaveTextContent('Message to Dr. Amanda Pell')
    expect(table).toHaveTextContent('Dr. Amanda Pell accepted v1 of the Pell proposal')
    expect(table).toHaveTextContent('via a scripted clock jump')
  })

  it('Supervision shows the proposal as she received it, with where it came from', async () => {
    const act = await sent()
    sessionStorage.setItem('ws-viewer', 'cco-001')
    renderRoutes(routes, `/supervision/correspondence/${act.messageId ?? ''}`)
    const main = screen.getByRole('main')
    expect(await within(main).findByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toHaveTextContent('Dr. Amanda Pell')
    expect(main).toHaveTextContent('Dear Dr. Pell,')
    expect(main).toHaveTextContent('The approved v1 of the prospect proposal')
    expect(main).toHaveTextContent('delivered with Form ADV Part 2A (firm brochure)')
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/prospect-supervision.test.ts src/workspace/__tests__/prospect-archive.test.tsx --testTimeout 30000`
Expected: FAIL — `partyId` is not an archive filter; the review on Monday is not listed today.

- [ ] **Step 3: The books name parties**

In `src/types/workspace-supervision.ts` apply the Interfaces' `ArchiveEntry`, `ArchiveFilters` and `Archive` (`clients` → `parties`); `CorrespondenceItem` becomes

```ts
export type CorrespondenceItem = {
  kind: 'correspondence'
  /** The sent message's id. */
  id: string
  title: string
  threadId: string
  partyId: string
  partyName: string
  partyKind: PartyKind
  /** The message exactly as the party received it. */
  message: TextMessage
  /** The firm's send record, with its provenance (basis, editors). */
  sendAct: BindingAct
  flagged: boolean
  fingerprint: string
}
```

In `src/mocks/workspace/archive.ts`:

```ts
const partyName = (id: string | undefined) => (id === undefined ? undefined : partyOf(id)?.name)

function partyIdOf(act: BindingAct, thread: Thread | undefined): string | undefined {
  if (act.subject?.type === 'proposal') return proposalById(act.subject.id)?.clientId
  if (act.subject?.type === 'prospect_proposal') return prospectProposalById(act.subject.id)?.prospectId
  if (act.subject?.type === 'prospect') return act.subject.id
  if (act.subject?.type === 'alert') {
    const alert = alertById(act.subject.id)
    return alert ? alertContext(alert).clientId : undefined
  }
  if (act.subject?.type === 'meeting') return meetingEvent(act.subject.id)?.clientId
  return thread?.partyId
}
```

and `entriesOf` / `archiveFor` read and write `partyId` / `partyName` (the sent message's `partyName` is `partyName(sentParty) ?? sent.thread.title`), filter on `filters.partyId`, and return `parties` in place of `clients`. In `src/mocks/handlers/workspace-supervision.ts` the archive route reads `partyId` from the query string in place of `clientId`.

In `src/mocks/workspace/supervision.ts`: `correspondenceItem` builds `{ …, partyId: party.id, partyName: party.name, partyKind: party.kind, title: \`Message to ${party.name}\` }` from `partyOfThread(sent.thread)`; and the queue's day is the session's:

```ts
  // "Today" is the session clock's day: a review after a clock jump is today's review.
  const today = sessionNow().slice(0, 10)
  const disposedToday = s.acts
    .filter((a) => COMPLIANCE_ACT_KINDS.has(a.kind) && a.at.slice(0, 10) === today)
```

(import `sessionNow` from `@/mocks/data/workspace-store`; drop `MOCK_TODAY_ISO` if unused).

- [ ] **Step 4: The UI names parties and the presenter's path**

Add to `src/workspace/prospect/prospect-words.ts`:

```ts
/** The archive's short note of how the one presenter made a record that names someone else. */
export const PATH_NOTE: Readonly<Record<PresenterPath, string>> = {
  shortcut: 'via the presenter shortcut', view_as: 'via the presenter, viewing as her', scripted: 'via a scripted clock jump',
}
```

- `archive-filters.ts`: `clientId` → `partyId` (URL parameter and filter key).
- `ArchivePage.tsx`: the first select becomes `<Select label="Client or prospect" layout="stacked" value={filters.partyId ?? ''} onChange={set('partyId')} options={[{ value: '', label: 'All clients and prospects' }, ...data.parties.map((p) => ({ value: p.id, label: p.name }))]} />`; the lead sentence reads "Every recorded act and every message sent to a client or prospect, in the order they happened."
- `ArchiveTable.tsx`: `recordedBy` returns `` entry.act.viaPresenter ? `${name} · ${PATH_NOTE[entry.act.viaPresenter.path ?? 'shortcut']}` : name ``; the sent-message summary reads `` `Message to ${entry.partyName}` ``.
- `CorrespondenceEvidence.tsx`: the pane title becomes `` `As ${item.partyName} saw it` `` and the band `<VisibilityBand visibility="client" scale="message" audience={item.partyName} party={item.partyKind} />`.
- `draft-origin.ts` `sentLetterOrigin`, first lines:

```ts
export function sentLetterOrigin(act: BindingAct, directory: Directory): string | undefined {
  if (act.kind !== 'send_to_party') return undefined
  if (act.subject?.type === 'prospect_proposal' && act.basis) {
    const delivered = (act.delivers ?? []).map((d) => DISCLOSURE_TITLES[d])
    return `The approved v${act.basis.version} of the prospect proposal · fingerprint ${act.basis.fingerprint}${delivered.length > 0 ? ` · delivered with ${delivered.join(', ')}` : ''}`
  }
  if (!act.editedBy) return undefined
  …unchanged
```

Update the tests that read the renamed fields: `archive.test.ts:25` `clientId` → `partyId`, `:27` `clientName` → `partyName`, `:34-35` `{ clientId: … }` → `{ partyId: … }`; `workspace-supervision-api.test.ts:35` `clientId=cli-999` → `partyId=cli-999`; `archive.test.tsx:48,50` `clientId=cli-001` → `partyId=cli-001` and `getByLabelText('Client')` → `getByLabelText('Client or prospect')`; any `toEqual({ entries: [], clients: [], dates: [] })` → `parties: []`.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/mocks/workspace/__tests__/ src/mocks/handlers/__tests__/workspace-supervision-api.test.ts src/workspace/__tests__/archive.test.tsx src/workspace/__tests__/supervision.test.tsx src/workspace/__tests__/disposition.test.tsx src/workspace/__tests__/prospect-archive.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build; commit**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`

```bash
git add -A src
git commit -m "feat(supervision): prospect work in the Archive and the queue — parties named, the presenter's path recorded, today is the session's day

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

### Task 14: The story end to end, and the visual baselines

One presenter runs first contact to onboarding without leaving the workspace: the Brief's next-best action → her thread → Form CRS → the coffee → her reply on the jump → Profile and Transfer-In findings → v1 → a revision → approval with the best-interest record → the send with ADV 2A → View as her (only her thread) → her acceptance on the jump → onboarding → View as Mark (Supervision, Archive) → the prospect page from the command line. A second story performs her steps through the shortcut and as her. Then every baseline is regenerated and looked at.

**Files:**
- Create: `e2e-visual/prospect-proposal.spec.ts`
- Modify: `e2e-visual/workspace-steps.ts`; existing specs only where they count what this phase added (threads, agents, "View as" options, the thread group "Clients and prospects", the send act's label "Send to client or prospect"); `e2e-visual/__baselines__/*` (regenerated)

**Interfaces:**
- Consumes: the whole phase.
- Produces (`e2e-visual/workspace-steps.ts`):

```ts
export const PELL_REPLY_TEXT = 'Thank you for the coffee. Here are my answers to the questionnaire and my two statements.'
export const PELL_ACCEPTANCE_TEXT = "I've read the proposal and I'd like to go ahead."
export async function deliver(page: Page, short: 'Form CRS' | 'ADV Part 2A' | 'ADV Part 2B' | 'privacy notice'): Promise<void>
export async function recordTheCoffee(page: Page): Promise<void>
export async function advanceTo(page: Page, label: 'reply' | 'acceptance'): Promise<void>
export async function askAgentNamed(page: Page, name: string): Promise<void>
export async function reviseToTwoTaxYears(page: Page): Promise<void>
export async function approveProspect(page: Page, version: number): Promise<void>
export async function sendToHer(page: Page, version: number): Promise<void>
```

- [ ] **Step 1: The steps**

Append to `e2e-visual/workspace-steps.ts`:

```ts
export const PELL_REPLY_TEXT = 'Thank you for the coffee. Here are my answers to the questionnaire and my two statements.'
export const PELL_ACCEPTANCE_TEXT = "I've read the proposal and I'd like to go ahead."
const JUMP_LABEL = { reply: 'Advance to her reply · Thu 26 Feb 09:10 ET', acceptance: 'Advance to her acceptance · Mon 2 Mar 10:00 ET' } as const

/** A disclosure from her thread's timeline (or the onboarding checklist), confirmed as a binding act. */
export async function deliver(page: Page, short: 'Form CRS' | 'ADV Part 2A' | 'ADV Part 2B' | 'privacy notice') {
  await context(page).getByRole('button', { name: `Deliver ${short}`, exact: true }).click()
  await page.getByRole('dialog', { name: `Deliver ${short} to Dr. Amanda Pell?` }).getByRole('button', { name: 'Confirm' }).click()
  await expect(context(page).getByRole('button', { name: `Deliver ${short}`, exact: true })).toHaveCount(0)
}

export async function recordTheCoffee(page: Page) {
  const clock = context(page).getByRole('region', { name: 'Clock' })
  await clock.getByRole('button', { name: 'Record the coffee' }).click()
  await page.getByRole('dialog', { name: 'Record the coffee' }).getByRole('button', { name: 'Record', exact: true }).click()
  await expect(clock).toContainText('Coffee recorded')
}

export async function advanceTo(page: Page, to: 'reply' | 'acceptance') {
  await context(page).getByRole('button', { name: JUMP_LABEL[to] }).click()
  await expect(conversation(page)).toContainText(to === 'reply' ? PELL_REPLY_TEXT : PELL_ACCEPTANCE_TEXT)
}

export async function askAgentNamed(page: Page, name: string) {
  await context(page).getByRole('region', { name: 'Ask an agent' }).getByRole('button', { name: `Ask ${name}`, exact: true }).click()
}

export async function reviseToTwoTaxYears(page: Page) {
  const proposal = page.getByRole('region', { name: 'Proposal · Pell proposal' })
  await proposal.getByRole('button', { name: 'Revise' }).click()
  const dialog = page.getByRole('dialog', { name: 'Revise the Pell proposal' })
  await dialog.getByLabel('Staged sale of the concentrated stock').selectOption('2')
  await dialog.getByRole('button', { name: 'Ask for v2' }).click()
  await expect(proposal.getByRole('table', { name: 'Staged sale option · v2' })).toBeVisible()
}

export async function approveProspect(page: Page, version: number) {
  const approval = context(page).getByRole('region', { name: 'Approval · Pell proposal' })
  await approval.getByRole('checkbox', { name: `I reviewed v${version}: its model, its transfer plan, its fees and the best-interest record.` }).check()
  await approval.getByRole('button', { name: `Approve v${version}` }).click()
  await page.getByRole('dialog', { name: `Approve v${version} of the Pell proposal?` }).getByRole('button', { name: 'Confirm' }).click()
  await expect(approval).toContainText(`v${version} is approved`)
}

export async function sendToHer(page: Page, version: number) {
  await context(page).getByRole('region', { name: 'Proposal' }).getByRole('button', { name: `Send v${version} to Dr. Pell` }).click()
  await page.getByRole('dialog', { name: `Send v${version} to Dr. Pell?` }).getByRole('button', { name: 'Confirm' }).click()
  await expect(conversation(page)).toContainText('Dear Dr. Pell,')
}
```

- [ ] **Step 2: The scenes and the stories**

Create `e2e-visual/prospect-proposal.spec.ts`:

```ts
import { test, expect, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  PELL_ACCEPTANCE_TEXT, advanceTo, approveProspect, askAgentNamed, context, conversation, deliver, deskLink, goTo, heading, recordTheCoffee,
  reviseToTwoTaxYears, sendToHer, settle, threadLink, viewAs, visit, type Theme,
} from './workspace-steps'

type Layout = 'three-panes' | 'full-width'
type Scene = { name: string; layout: Layout; open: (page: Page) => Promise<void> }

/** Form CRS at first contact, the coffee, and her reply on Thursday's jump. */
async function replied(page: Page, theme: Theme) {
  await visit(page, '/t/th-pell', theme)
  await deliver(page, 'Form CRS')
  await recordTheCoffee(page)
  await advanceTo(page, 'reply')
}

/** Her findings, v1, the staged revision, v2 approved with the best-interest record. */
async function approved(page: Page, theme: Theme) {
  await replied(page, theme)
  await threadLink(page, 'Pell · prospect work').click()
  await expect(heading(page)).toHaveText('Pell · prospect work')
  await askAgentNamed(page, 'Prospect Profile')
  await expect(conversation(page).getByRole('article', { name: /^Prospect Profile: Dr\. Amanda Pell's answers/ })).toBeVisible()
  await askAgentNamed(page, 'Transfer-In')
  await expect(conversation(page).getByRole('article', { name: /^Transfer-In: Stryker Corp\. is a concentrated position/ })).toBeVisible()
  await askAgentNamed(page, 'Proposal Agent')
  await expect(page.getByRole('table', { name: 'Transfer in kind · v1' })).toBeVisible()
  await reviseToTwoTaxYears(page)
  await approveProspect(page, 2)
}

async function sent(page: Page, theme: Theme) {
  await approved(page, theme)
  await threadLink(page, 'Dr. Amanda Pell').click()
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await sendToHer(page, 2)
}

async function accepted(page: Page, theme: Theme) {
  await sent(page, theme)
  await advanceTo(page, 'acceptance')
}

const pellThread = async (page: Page) => { await sent(page, 'light'); await settle(page) }
const pellThreadAsHer = async (page: Page) => {
  await sent(page, 'light')
  await viewAs(page, 'Dr. Amanda Pell · Prospect')
  await expect(context(page).getByRole('region', { name: 'Your steps' })).toBeVisible()
  await settle(page)
}
const pellWork = async (page: Page) => { await approved(page, 'light'); await settle(page) }
const pellOnboarding = async (page: Page) => {
  await accepted(page, 'light')
  await threadLink(page, 'Pell · prospect work').click()
  await expect(context(page).getByRole('table', { name: 'Onboarding checklist' })).toBeVisible()
  await settle(page)
}
const prospectPage = (theme: Theme) => async (page: Page) => {
  await accepted(page, theme)
  await goTo(page, 'Prospect · Dr. Amanda Pell')
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await expect(page.getByRole('table', { name: 'Versions · Pell proposal' })).toBeVisible()
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'pell-thread-light', layout: 'three-panes', open: pellThread },
  { name: 'pell-thread-prospect-light', layout: 'three-panes', open: pellThreadAsHer },
  { name: 'pell-work-light', layout: 'three-panes', open: pellWork },
  { name: 'pell-onboarding-light', layout: 'three-panes', open: pellOnboarding },
  { name: 'prospect-page-light', layout: 'full-width', open: prospectPage('light') },
  { name: 'prospect-page-dark', layout: 'full-width', open: prospectPage('dark') },
]

for (const scene of SCENES) {
  test.describe(scene.name, () => {
    test.describe.configure({ timeout: 120_000 })

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

    if (scene.layout === 'full-width') {
      test('the page takes the full width: no thread list', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 900 })
        await scene.open(page)
        await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
      })
    }
  })
}

test('one presenter takes Dr. Pell from first contact to an onboarding opened; she sees only her thread; Mark sees the record', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The Brief's next-best action opens her thread.
  await visit(page, '/t/th-brief', 'light')
  const action = conversation(page).getByRole('article', { name: 'Next best action · Referral: Dr. Amanda Pell' })
  await action.getByRole('link', { name: /Open her thread/ }).click()
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await expect(page.getByRole('note', { name: 'Visibility: PROSPECT CAN SEE' })).toBeVisible()

  // 2. Form CRS at first contact; the coffee; her reply on Thursday's jump.
  await deliver(page, 'Form CRS')
  await expect(conversation(page).getByRole('article', { name: 'Delivered · Form CRS (client relationship summary)' })).toBeVisible()
  await recordTheCoffee(page)
  await advanceTo(page, 'reply')
  await expect(conversation(page).getByRole('article', { name: 'Dr. Amanda Pell · Shared two statements: Fidelity taxable brokerage and TIAA 403(b).' })).toBeVisible()

  // 3. The internal thread: findings, v1, a revision, v2 approved with the best-interest record.
  await threadLink(page, 'Pell · prospect work').click()
  await expect(conversation(page).getByRole('article', { name: /^Note · Coffee with Dr\. Amanda Pell/ })).toContainText('15:30–16:30 ET')
  await askAgentNamed(page, 'Prospect Profile')
  await askAgentNamed(page, 'Transfer-In')
  await expect(conversation(page).getByRole('article', { name: 'Transfer-In: Rollover of the former employer 403(b): asked about; comparison to follow.' })).toBeVisible()
  await askAgentNamed(page, 'Proposal Agent')
  await expect(page.getByRole('region', { name: 'Proposal · Pell proposal' })).toContainText('Prices as of 25 Feb 2026 close.')
  await reviseToTwoTaxYears(page)
  await expect(context(page).getByRole('region', { name: 'Approval · Pell proposal' })).toContainText('Staying self-directed')
  await approveProspect(page, 2)
  await expect(context(page).getByRole('region', { name: 'Follow-up' })).toContainText('comparison to follow')

  // 4. Her thread: v2 sent, with ADV 2A delivered in the same record, before it.
  await threadLink(page, 'Dr. Amanda Pell').click()
  await sendToHer(page, 2)
  await expect(conversation(page).getByRole('article', { name: 'Delivered · Form ADV Part 2A (firm brochure)' })).toBeVisible()

  // 5. View as her: only her thread, her slips in her terms, nothing of the firm's work.
  await viewAs(page, 'Dr. Amanda Pell · Prospect')
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)
  await expect(conversation(page)).toContainText('Dear Dr. Pell,')
  const firmWork = /binding|Supervisory review|Prospect Profile|Transfer-In|best-interest|Balanced Growth|Staying self-directed|prospect work|scripted|presenter|Mike Chen/i
  await expect(page.getByRole('main')).not.toContainText(firmWork)
  await expect(context(page)).not.toContainText(firmWork)
  await expect(context(page).getByRole('region', { name: 'Your steps' })).toContainText('Accept v2')

  // 6. Back as Adrian: her acceptance on Monday's jump; the onboarding it opened.
  await viewAs(page, 'Adrian Hale · Advisor')
  await advanceTo(page, 'acceptance')
  await expect(conversation(page)).toContainText(PELL_ACCEPTANCE_TEXT)
  await threadLink(page, 'Pell · prospect work').click()
  const checklist = context(page).getByRole('table', { name: 'Onboarding checklist' })
  await expect(checklist).toContainText('CIP identity verification')
  await expect(checklist).toContainText('OFAC screen')
  await expect(checklist).toContainText('Trusted contact (FINRA Rule 4512)')
  await expect(checklist).toContainText('2026-03-09')
  await deliver(page, 'ADV Part 2B')
  await deliver(page, 'privacy notice')

  // 7. Mark: the proposal in Supervision with its provenance; every act in the Archive under her name.
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await page.getByRole('navigation', { name: 'Supervision queue' }).getByRole('link', { name: /^Message to Dr\. Amanda Pell/ }).click()
  await expect(page.getByRole('main')).toContainText('The approved v2 of the prospect proposal')
  await goTo(page, 'Archive')
  await page.getByLabel('Client or prospect').selectOption({ label: 'Dr. Amanda Pell' })
  const archive = page.getByRole('table', { name: 'Archive' })
  await expect(archive).toContainText('Approved v2 of the Pell proposal, with the best-interest record')
  await expect(archive).toContainText('Dr. Amanda Pell accepted v2 of the Pell proposal')
  await expect(archive).toContainText('via a scripted clock jump')

  // 8. The prospect page, from the command line.
  await viewAs(page, 'Adrian Hale · Advisor')
  await goTo(page, 'Prospect · Dr. Amanda Pell')
  await expect(heading(page)).toHaveText('Dr. Amanda Pell')
  await expect(page.getByRole('list', { name: 'Stage history' })).toContainText('Onboarding')
  await expect(page.getByRole('table', { name: 'Disclosures delivered' })).toContainText('Privacy notice')
})

test('the presenter performs her steps through the shortcut and as her; each is recorded as her, marked', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await visit(page, '/t/th-pell', 'light')
  await expect(context(page).getByRole('button', { name: 'Advance to her reply · Thu 26 Feb 09:10 ET' })).toBeDisabled()
  await recordTheCoffee(page)
  const demo = context(page).getByRole('region', { name: 'Demo · act as Dr. Pell' })
  await demo.getByRole('button', { name: 'Answer her questionnaire' }).click()
  await page.getByRole('dialog', { name: 'Answer her questionnaire as Dr. Pell?' }).getByRole('button', { name: 'Confirm' }).click()
  await expect(conversation(page).getByRole('article', { name: 'Dr. Amanda Pell · Answered the risk questionnaire.' })).toBeVisible()
  await viewAs(page, 'Dr. Amanda Pell · Prospect')
  await context(page).getByRole('region', { name: 'Your steps' }).getByRole('button', { name: 'Share my statements' }).click()
  await expect(conversation(page).getByRole('article', { name: /^Dr\. Amanda Pell · Shared two statements/ })).toBeVisible()
  await viewAs(page, 'Adrian Hale · Advisor')
  await expect(context(page).getByRole('button', { name: /^Advance to her reply/ })).toHaveCount(0)
  await expect(context(page).getByRole('button', { name: 'Advance to her acceptance · Mon 2 Mar 10:00 ET' })).toBeDisabled()
})
```

- [ ] **Step 3: Run the new spec against a fresh baseline set**

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/prospect-proposal.spec.ts`
Expected: the two stories and every layout check PASS; the six baseline tests FAIL only because their PNGs do not exist yet. Fix any story failure in the app (or a step's locator when the app is right), never by loosening an assertion.

- [ ] **Step 4: Update the older specs where they count what this phase added**

Run: `VISUAL_PORT=5195 pnpm visual`
Expected: the older specs fail only on (a) screenshot drift (the new threads, agents, "View as" option, clock-dependent timestamps), and (b) assertions that count threads, agents or "View as" options, read the thread group "Client", or read "Send to client". Update (b) to the new truth; leave (a) for Step 5.

- [ ] **Step 5: Regenerate and look at every baseline**

Run: `VISUAL_PORT=5195 pnpm visual:update`
Then open every PNG under `e2e-visual/__baselines__/` that changed (`git status e2e-visual/__baselines__`) and look at it: the thread list shows "Dr. Amanda Pell" under "Clients and prospects" and "Pell · prospect work" under "Internal"; the Desk pane names Prospect Profile and Transfer-In; her bands read "PROSPECT CAN SEE" / "Firm only · prospect can't see"; nothing is clipped, overlapped or cut off; the dark scenes use dark tokens throughout. A wrong-looking PNG is a bug to fix before committing, not a baseline.

- [ ] **Step 6: Run everything once more**

Run: `VISUAL_PORT=5195 pnpm visual && pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add e2e-visual
git commit -m "test(visual): the prospect story end to end — her thread both ways, the work thread, onboarding, the prospect page; every baseline regenerated

Co-Authored-By: Claude <model name> <noreply@anthropic.com>"
```

---

## Self-review notes (for the executor)

- **Spec coverage.** Data truth → Task 1 (Pell rename, Foster, prospects advisor/dates/referrer, the firm, the table, the guards). External-party boundary → Task 2 (audit table above; `isExternalRole`; `partyId`; 404s; band words). Prospect record and seeded statements → Tasks 3 and 5 (statements are scripted content she shares, R5). Disclosures → Task 4 (ADV 2A with the send → Task 7). Agents → Task 5 (Profile, Transfer-In), Task 6 (Proposal, extended). Prospect proposal, versions, fees, "Prices as of 25 Feb 2026 close." → Task 6. Approval with the best-interest record, `send_to_party`, Form CRS → 409, Mark's review → Tasks 7, 13. Clock jumps, her steps three ways, acceptance → onboarding → Task 8. API table → Task 9 (plus R16's three). Screens: her thread → Task 10; internal thread → Task 11; prospect page and command line → Task 12; the NBA → Task 3 (Brief line) and Task 14 (story). Testing: engine bullets → Tasks 2–8; data guards → Task 1; UI end to end and baselines → Task 14. Out of scope (conversion, ACAT settlement, e-signature mechanics, spouse, rollover recommendation, Monte Carlo) → nothing builds them; ACAT is "Not started"; signatures are states.
- **Names used across tasks.** `isExternalRole` / `isExternalViewer` / `isFirmViewer` / `isExternalViewerIn`; `partyId`, `partyOf`, `partyOfThread`, `threadParty`; `send_to_party` / `sendToParty` / `useSendToParty`; `ProspectRecord`, `ProspectView`, `ProspectProposalDetail`, `StepOutcome`, `PartySteps`; `visibleProspect`, `requireProspect`, `prospectRevision`; `deliverDisclosure`, `recordDelivery`, `deliverableNow`; `profileOf`, `transferSummary`, `concentrationOf`, `closeOf`; `buildProspectVersion`, `createProspectProposal`, `reviseProspectProposal`, `prospectProposalDetail`, `bestInterestDraftOf`; `approveProspectProposal`, `sendProspectProposal`; `recordCoffee`, `herStep`, `actAsProspect`, `advanceProspect`, `partySteps`, `nextJumpOf`; `prospectView`. Each is defined in the task its Interfaces block names and imported by that name afterwards.
- **Test fixtures.** `src/mocks/workspace/__tests__/pell-threads.ts` (Task 2) becomes a no-op once Task 3 seeds the threads; keep it. `prospect-fixture.ts` (Task 5) writes her reply straight onto the record for engine tests that are not about the steps; Task 8's tests use the real steps.
