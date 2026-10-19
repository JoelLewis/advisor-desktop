# Phase 6: prospect proposal and onboarding

**Date:** 13 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 6)
**Builds on:** Phase 5 (`2026-10-13-phase-5-meetings-design.md`), branch `workspace` @ 86f43bc (+ Phase 5 polish)

## Goal

Long-running work with a prospect who is not yet a client — the hardest visibility case. A referral,
Dr. Amanda Pell, goes from first contact to a sent proposal she accepts and an onboarding opened,
driven by one presenter as Adrian Hale. Disclosures are delivered as recorded acts at the right
moments; scripted agents profile her, analyse what she would transfer in and draft the proposal;
Adrian approves one version with a firm-only best-interest record and sends it. She sees only her
thread. One external-party boundary protects every firm surface from prospects and clients alike.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Whose story | Dr. Amanda Pell (renamed from the "Dr. Amanda Foster" referral to avoid the William Foster collision): today's 15:30 coffee → proposal → acceptance |
| How her steps happen | Both: scripted replies arrive on labelled clock jumps; and a presenter shortcut "Demo · act as Dr. Pell" / View as her lets the presenter perform them (recorded as her, firm-only `viaPresenter`) |
| Proposal content | Firm model from her questionnaire, account structure, in-kind vs sell transfer-in plan with gains and tax estimate from her cost basis, fees, firm-only best-interest record; versioned and approved like Phase 3 |
| Where it ends | At acceptance and onboarding opened (applications, CIP/KYC checklist, agreement awaiting signature, ACAT not started). Conversion to client is out of scope |
| Visibility architecture | One external-party boundary: a `prospect` role; every `role === 'client'` gate becomes `isExternalViewer()`; external-visible threads carry `partyId` (client or prospect id); the band names the party ("PROSPECT CAN SEE" / "CLIENT CAN SEE") |

## Data truth (fixed first)

- "Dr. Amanda Foster" becomes **Dr. Amanda Pell**, prospect `prsp-011`: calendar `evt-004`,
  `nba-015`, `note-009`, `task-004`, the activity entry. Orthopedic surgeon, 52, married filing
  jointly (spouse not a party), referred by James Thompson (`cli-008`).
- William Foster (`cli-017`) is reconciled to one story (accounts opened 2022): `workflows.ts`
  task-020/proc-001, `documents.ts`, `notes.ts`, `activities.ts`, `compliance.ts` comp-003, `nba-019`.
- Prospects are assigned to Adrian Hale (`user-001`), not Sarah Mitchell (CSA). The old proposal
  text's "Sarah Mitchell, CFP, CFA, Senior Wealth Advisor" / "Mitchell Wealth Advisors" is removed or
  replaced with the workspace firm and advisor.
- Prospect next-action dates and `task-004` move off weekends; `prsp-005`'s referrer is a real client.
- One shared table maps questionnaire risk profiles to the firm's models (`mod-001`…`mod-007`); no
  questionnaire label names a model that does not exist.
- Guards: no weekend prospect dates; no Foster conflation; no "Mitchell Wealth Advisors"; referrers
  exist; every risk profile maps to a real model.

## Engine

### External-party boundary

- `Role` gains `prospect`; Dr. Pell is a directory person (`prsp-011`) and a "View as" choice.
- `isExternalViewer(viewer)` (client or prospect) replaces every `role === 'client'` gate
  (visibility, meetings, household/client views, workspace post/acts/drafts gates, supervision,
  archive, proposals, provenance stripping).
- `Thread.clientId` generalises to `partyId`; an external viewer sees a thread only when its
  visibility is `client` (renamed in UI per party) and `partyId === viewer.id`. Prospects and clients
  never see each other's threads; external viewers get 404 from every firm surface.

### Prospect record (session-scoped, reset with the workspace store)

```ts
type Holding = { symbol: string; name: string; quantity: number; costBasis: number; acquired: string; assetClass: string }
type Statement = { id: string; custodian: string; accountType: 'taxable_brokerage' | '403b'; holdings: Holding[]; cash: number; asOf: string }
type Prospect = {
  id: string; name: string; referredBy?: string; stage: 'contact' | 'discovery' | 'proposal' | 'accepted' | 'onboarding'
  threadId: string; internalThreadId: string
  questionnaire?: { answers: Record<string, string>; receivedAt: string }
  statements: Statement[]                  // shared by her; held-away data, not engine positions
  disclosures: DisclosureDelivery[]        // append-only
  onboarding?: OnboardingChecklist
}
```

- Seeded statements: a taxable brokerage account at another custodian (about $2.1M: an S&P 500
  index ETF, a concentrated low-basis medical-device stock about 18% of assets, cash) and an old
  403(b) from a former hospital employer (about $0.9M). Prices are the frozen 2026-02-25 prices.

### Disclosures (binding acts)

- `deliver_disclosure` `{ prospectId, document: 'form_crs' | 'adv_2a' | 'adv_2b' | 'privacy_notice' }`
  — advisor only; append-only; timestamped by the session clock; visible to her as a delivered
  document in her thread.
- Rules: Form CRS before or at the first recommendation (sending a proposal without it → 409
  `FORM_CRS_REQUIRED`); ADV 2A at or before the proposal (the send act may deliver it in the same
  act); ADV 2B and the privacy notice at onboarding.

### Agents (scripted, deterministic, digit-free claims, citations)

| Agent | Where | May | May not |
|---|---|---|---|
| Prospect Profile | internal thread | score the questionnaire; map to a firm model with its working | contact the prospect; recommend accounts |
| Transfer-In | internal thread | read her statements; per holding in kind vs sell with gain and tax estimate | sell; recommend a rollover |
| Proposal (extended) | internal thread | draft and revise a prospect proposal under constraints | approve; send |

### Prospect proposal

- Built from: the profile's model (her score ≈ 66 → Growth `mod-002`, 75/25), account structure
  (individual taxable; the 403(b) rollover recorded only as "asked about; comparison to follow" with
  a follow-up task), the transfer-in plan (index ETF in kind; the concentrated stock in kind with its
  unrealised gain and the tax if sold now at 23.8% long-term, staged diversification documented as an
  option to decide with her CPA — nothing sold in the proposal), and fees from the tiered schedule
  (blended rate and annual estimate). "Prices as of 25 Feb 2026 close."
- Versions are append-only and fingerprinted; Adrian approves one version; approval files the
  **best-interest record** (firm only): alternatives considered (a lower-risk model; staying
  self-directed), costs, why the model, concentration risk noted.
- `send_to_party` (generalised `send_to_client`) sends the approved version's client-readable
  summary and figures to her thread; refused if Form CRS was not delivered; delivers ADV 2A if not yet
  delivered. Mark's correspondence review picks it up.

### Clock jumps

- Labelled controls advance the session clock forward only: "Advance to her reply · Thu 26 Feb
  09:10 ET", "Advance to her acceptance · Mon 2 Mar 10:00 ET". Engine "today" for tax and trading
  stays 2026-02-25; prices stay the 25 Feb close and the proposal says so.

### Her steps

- Scripted: the jumps deliver her questionnaire answers and statements, then her acceptance.
- Presenter: "Demo · act as Dr. Pell" or View as her performs the same steps, recorded as
  `prsp-011` with a firm-only `viaPresenter` marker.
- Acceptance opens onboarding once: individual taxable account application; CIP identity
  verification, OFAC screen, trusted contact (FINRA 4512), source of funds; advisory agreement and
  ADV 2B awaiting her signature; ACAT not started. Owners Adrian or Sarah; trading-day due dates.

### API (viewer-filtered; external viewers get 404 from firm surfaces)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/workspace/prospects/:id` | prospect record (firm) |
| POST | `/api/workspace/prospects/:id/advance` | the next scripted step (clock jump) |
| POST | `/api/workspace/prospects/:id/questionnaire`, `/statements`, `/accept` | her steps (as her, or via the shortcut) |
| POST | `/api/workspace/prospects/:id/proposals` (+ revise / versions / preview) | prospect proposal versions |
| POST | `/api/workspace/acts` | `deliver_disclosure`, `approve_proposal` (prospect), `send_to_party` |
| POST | `/api/workspace/presenter/act-as-prospect` | the shortcut |

## Screens

- **Her thread** "Dr. Amanda Pell" (band "PROSPECT CAN SEE"): Adrian's messages, delivered
  disclosures, her replies, the sent proposal. Firm view adds the context column (disclosures
  timeline, stage, advance controls, shortcut).
- **Internal thread** "Pell · prospect work": Profile and Transfer-In findings, proposal embed with
  versions, revise, approve with the best-interest record, onboarding checklist after acceptance.
- **Prospect page** `/prospects/:id` (firm only): profile, stage, disclosures with timestamps,
  questionnaire result and model mapping, transfer-in summary, proposal and versions, onboarding.
  Command line: "Prospect · Dr. Amanda Pell".
- The next-best action "Referral: Dr. Amanda Pell" opens her thread.

## Testing

- **Engine:** the one boundary (every former client gate goes through `isExternalViewer`; prospect
  404 from meetings, households, clients, supervision, archive, other parties' threads and her
  internal sibling; client and prospect never see each other's threads); disclosure rules (send before
  Form CRS → 409; ADV 2A at or before the proposal; append-only, session-clock timestamps); profile
  mapping through the shared table; transfer-in gains = quantity × frozen price − basis; tax at 23.8%
  long-term; fees per the tiered schedule; fingerprints; best-interest record firm only; digit-free
  claims; clock jumps forward only with engine today fixed; shortcut records `prsp-011` with
  `viaPresenter`; acceptance opens onboarding once with trading-day dues; reset.
- **Data guards** as listed above.
- **UI end to end:** NBA → her thread → Form CRS → coffee note → advance to her reply (and the
  shortcut path) → Profile and Transfer-In findings → proposal v1 → revise → approve with the record →
  send with ADV 2A → View as her (only her thread) → advance to acceptance → onboarding → View as Mark
  (Archive, Supervision) → prospect page from the command line.
- **Visual baselines:** her thread (firm view and her view), the internal thread with the proposal,
  the prospect page (light and dark), the onboarding checklist.

## Out of scope

- Converting the prospect to a client; ACAT settlement and funding (Phase 7 or later).
- E-signature mechanics (signatures are recorded states); real CRM integration.
- Her spouse as a party; recommending the 403(b) rollover; Monte Carlo or a full financial plan.

## Success criteria

- One presenter runs first contact → onboarding opened without leaving the workspace.
- The prospect boundary holds everywhere through one predicate.
- Disclosure timing is recorded and enforced; every figure comes from the engine.
