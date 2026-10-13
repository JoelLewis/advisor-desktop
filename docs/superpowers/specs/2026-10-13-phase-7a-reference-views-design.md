# Phase 7a: reference full views

**Date:** 13 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 7, split: 7a views, 7b polish and the switch)
**Builds on:** Phase 6 (`2026-10-13-phase-6-prospect-proposal-design.md`), branch `workspace` @ 47b9ebf

## Goal

The dense reference work that is not a conversation moves into full views in the instrument
language, each one step from a thread: billing, reconciliation, risk, attribution, model governance,
practice (revenue and book of business) and a trading blotter. Every figure is derived from the
engine or plainly labelled as modelled, with its method stated. Firm only.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Split | 7a reference views (this spec); 7b showcase polish and the switch to `main` (separate spec) |
| Which views | The roadmap's five (billing, reconciliation, risk, attribution, model governance) plus Practice (revenue, book of business) and a Trading blotter. Tax center, engagement, workflows and settings stay retired; their jobs live in threads, and 7b redirects their old routes |
| Hand-typed figures | Derive what the engine can derive; keep assumptions and synthetic series but label them with their method ("modelled, not realised"); seeded governance history gets invariant tests and correct benchmark names |

## Views and placement

| View | Route | Opened from |
|---|---|---|
| Billing | `/billing` | command line; household view |
| Reconciliation | `/reconciliation` | command line; the Brief |
| Risk | `/accounts/:id/risk` (account), `/risk` (book) | account view; command line |
| Attribution | `/accounts/:id/attribution` | account view |
| Model governance | `/models`, `/models/:id` | command line; an account's model line |
| Practice | `/practice` | command line |
| Trading blotter | `/blotter` | command line; staged/filled panels in threads |

- Shell placement: thread list hidden (like Supervision), `?from=<threadId>` back-link where opened
  from a thread. External viewers (clients, prospects) get "not found" and 404 from every endpoint.
- Every row offers **Take to team thread** (the carry pattern): a break, a model change or an
  out-of-band account becomes a conversation with its figures quoted and cited.
- Each view ends with **Methods & sources**: how its figures are computed and what is modelled.
- The Desk pane gains a **Reference** group linking the views (firm viewers only).
- Views read the session's moved book: after the Phase 4 release the blotter shows the fills, and
  acc-002's risk and attribution reflect its new holdings.

## Engine

- **Billing:** prior quarters recomputed from each household's period-end value (from the modelled
  performance series, labelled modelled); fees through the tiered schedule with the tier breakdown
  shown; billing in advance stated; Garcia's advance/arrears exception made consistent with her fee
  terms. Invariants: cycle total = Σ households; fee = tiered schedule on value.
- **Reconciliation:** position, cash and transaction match rates computed from checked records vs
  open breaks; the 30-day trend ends at today's open-break count; a seeded integration-health log
  per custodian explains each sync time and the MoneyGuidePro pending status. **Resolve break** is a
  recorded act (Adrian or Sarah), append-only, in the Archive, reducing the open count.
- **Risk:** factor exposures derived from each account's holdings by asset class through a
  factor-loading table labelled as model assumptions (no two accounts share a factor vector unless
  their holdings match); the page states "modelled, not realised" and the methods (parametric VaR,
  one month, 95%, normal; HHI concentration; stress tests replayed on today's holdings). A book page
  aggregates by account, sorted by risk score against the client's tolerance.
- **Attribution:** the existing Brinson-Fachler (exactly reconciling); caption: single-period,
  arithmetic, no linking, performance series modelled; benchmark line and a periods selector over
  the existing derivation.
- **Model governance:** seeded history kept with invariant tests (weights sum to 1; current version
  is the latest; no effective date after the frozen today; mod-005 v3 pending gets a future date);
  benchmark names corrected (Bloomberg US Aggregate, MSCI ACWI, blended policy benchmarks, a glide
  path) with a benchmark appropriate to each model's equity share. Read-only in 7a.
- **Practice:** revenue from billing; AUM and households from the engine; hand-typed team activity
  and book analytics replaced by derived figures or removed; effective fee in basis points.
- **Trading blotter:** every order across accounts — legacy OMS orders plus the session's staged,
  released and filled orders from Phases 3–4 — with account, side, quantity, price, status, source
  (proposal and version, or ticket), REC id and fill time; filters by status, account, date.

## Carry-overs (from Phase 6)

- Robert's recap: the rollover line reads "a rollover was asked about; comparison to follow" style
  wording, and the letter is signed with the firm name.
- Dr. Pell's later-year tax lines say "at today's rates".
- Her "about 18% of your assets" vs "about 95% in US stocks" lines name their bases.

## Testing

- **Engine:** billing totals and tiered fees, prior quarters from period-end values; reconciliation
  match rates from breaks, resolve-break act append-only and archived; risk factor exposures derived
  and distinct, VaR formula; attribution A+S+I = active return; governance invariants and benchmark
  names; practice revenue ties to billing and AUM to accounts; blotter includes session fills with
  correct source and REC links; every new endpoint 404 to external viewers; guards that the replaced
  hand-typed data cannot return (e.g. no two accounts with identical factor vectors).
- **UI:** each view's content, firm-only access, Take to team thread, Methods & sources; command-line
  destinations and Desk Reference links.
- **End to end:** run the Phase 4 release → blotter shows fills → acc-002 risk and attribution
  reflect the moved book → resolve a reconciliation break → Archive shows it → take an out-of-band
  account from book risk to a thread.
- **Visual baselines:** each view light; billing and risk dark.

## Out of scope

- Old-route redirects, stale route strings, README, CI and the merge to `main` (7b).
- Editing models; real price history; multi-period attribution linking.
- Tax center, engagement, workflows and settings (retired).

## Success criteria

- Every figure in the seven views is derived from the engine or labelled as modelled.
- Every view is one step from a thread; outsiders see none of them.
