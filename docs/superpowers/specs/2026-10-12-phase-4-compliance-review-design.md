# Phase 4: compliance review

**Date:** 12 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 4)
**Builds on:** Phase 3 (`2026-10-12-phase-3-rebalance-harvest-design.md`), branch `workspace` @ 112bb22

## Goal

Compliance becomes a real participant. Mark Davis (CCO, `cco-001`) works a supervision queue:
he releases, returns or escalates staged orders with a documented rationale; disposes of the
existing compliance alerts; and reviews sent client correspondence. Released orders fill at the
frozen day's prices and the book moves: positions, lots, realised sales and wash-sale windows
update, and every engine read sees the post-trade state. A firm-only archive is the books-and-records
surface. Robert sees nothing new.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| How Mark's review happens in a one-presenter demo | Both: the presenter switches "View as" to Mark and acts; and a labelled presenter shortcut "Demo · act as Mark Davis" performs Mark's default disposition. The record names Mark as the actor; a firm-only `viaPresenter` marker says it was the shortcut |
| After release | Simulated fills at the frozen day's prices; the session book moves |
| Queue contents | Staged orders awaiting release (blocking, pre-trade); existing compliance alerts (with their record trail); sent client correspondence (post-send review). Plus an archive of every act and sent message |

## Engine

### Session portfolio ledger

- Positions, tax lots and realised sales become a per-session ledger seeded from the fixtures and
  reset with the workspace store. Every engine read — drift, rebalance previews, Harvest Scanner,
  Drift Monitor, account view, wash-sale windows, return-level tax — reads through it.
- Fills apply to the ledger: a sell consumes the chosen lots (specific identification as approved,
  else the engine's tax-aware order) and records a realised sale (character, proceeds, basis,
  replacement when the proposal named one), which opens a recorded wash-sale window; a buy creates
  a lot dated the fill day at the fill price; cash moves by the fill values.
- Invariants: no negative quantity; no lot consumed twice; cash and quantities reconcile to fills;
  lot dates and fill times are on NYSE trading days within market hours (existing calendar).

### Compliance acts (performer: `cco-001` only; append-only; rationale required)

| Act | Subject | Effect |
|---|---|---|
| `release_orders` | `{ proposalId, approvalActId }` | Requires the active approval with that act id and matching fingerprint; staged orders → filled; fills applied |
| `return_to_advisor` | `{ proposalId, approvalActId }` | Approval withdrawn; staged orders → returned; advisor may revise and re-approve |
| `escalate` | `{ proposalId, approvalActId }` | Orders stay held; item flagged escalated |
| `dispose_alert` | `{ alertId, outcome: approve \| reject \| request_changes }` | Alert closed or returned; appended to its record trail |
| `review_correspondence` | `{ messageId, outcome: reviewed \| flagged }` | Sent message marked; flagged items stay in the queue |

- Each act records actor, event time, rationale, the evidence fingerprint it acted on, and
  `viaPresenter` (firm-only) when performed through the shortcut.
- Advisor attempts → 403. Client viewers → 404 everywhere. A release against a stale, withdrawn or
  superseded approval → 409 with the reason.

### API (viewer-filtered)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/workspace/supervision` | the queue: orders awaiting release, open alerts, correspondence to review, and items disposed today (firm viewers read; only `cco-001` acts) |
| GET | `/api/workspace/archive?clientId=&kind=&from=&to=` | every recorded act and sent client message, chronological (firm only) |
| POST | `/api/workspace/acts` | the five new kinds |
| POST | `/api/workspace/presenter/act-as-cco` | performs Mark's default disposition for a named item, recorded as `cco-001` with `viaPresenter` |

## Screens

- **Supervision** `/supervision` (thread list and command line): dense queue in three groups plus
  "Disposed today"; selecting a row opens the item beside the queue (workbench-style side by side).
  - Orders: approval record (version, fingerprint, approver, time), the approved version's legs,
    tax tape, pre-trade reading with warnings, repurchase restrictions; links to the team thread and
    to the workbench at that version. It shows the record; it does not re-run checks.
  - Alert: the alert, its record trail (sr-001…003), account context.
  - Correspondence: the message as the client saw it, plus firm-only provenance.
  - Disposition panel: the item kind's actions, required rationale (kit input), confirm step;
    focus to the new record slip.
- **Archive** `/archive`, firm only: chronological acts and sent messages with fingerprint, actor,
  time, thread; filters by client, kind, date; each entry links to its thread.
- **Team thread after release** (as Adrian): Mark's record slip, then a fills message (symbol, side,
  quantity, price, time); the staged-orders panel reads "Filled".
- **Presenter shortcut**: in Adrian's thread context beside staged orders, labelled
  "Demo · act as Mark Davis"; runs the release with Mark's default rationale.

## Effects of the moved book

- Account view and drift reflect fills; residual reasons (private equity) remain.
- Brief re-measures on view: Drift Monitor reports what the moved book measures (after a full
  rebalance, acc-002 inside its bands except private equity; after the harvest-only v3, US Equity
  still outside its band);
  the Harvest Scanner no longer offers INTC; the recorded INTC sale (2026-02-25, replacement as
  named) shows its window through 2026-03-27.
- The proposal reads filled; a new proposal for acc-002 starts from the new book.
- Robert's thread is unchanged (execution notice to the client is a later phase).

## Carry-over from Phase 3

- Drift Monitor citation: "open to <date>" → "through <date>"; re-baseline the Brief.
- Proposal Agent harvest-plus-substitute: when a buy would foreclose a harvest the Brief flags,
  harvest the loss and buy a non-identical substitute in the same class (existing substitution rules).
- Parked minors from the Phase 3 ledger may be taken where they touch these files.

## Testing

- Engine: separation of duties (advisor 403, client 404); release needs the matching active
  approval (stale/withdrawn → 409); one append-only act per disposition with rationale; fills on
  trading days in session at frozen prices; lots, cash, quantities and realised sales reconcile;
  the recorded window replaces the projected one; every engine read sees the post-fill book; reset
  restores the seed; presenter shortcut records `cco-001` with the firm-only marker.
- Whole book: releasing every account's approved proposal leaves no negative quantity, no lot sold
  twice, drift computed from new holdings.
- UI end to end: Phase 3 story to Approve v3 → view as Mark → Supervision → Johnson orders evidence
  → release with rationale → fills in the thread → review Robert's letter → dispose the AAPL alert →
  view as Adrian (slips, fills, account view, Brief changed) → view as Robert (unchanged) → presenter
  shortcut on a fresh session.
- Visual baselines: supervision queue and item (light and dark), archive, thread after release,
  Brief after fills.

## Out of scope

- Notifying the client of executions; trade confirmations to clients.
- Partial fills, price movement, market impact.
- Multi-supervisor workflows.

## Success criteria

- One presenter completes the supervisory loop with separation of duties visible on screen.
- Every figure after fills comes from the moved book.
- Viewing as Robert shows nothing new.
