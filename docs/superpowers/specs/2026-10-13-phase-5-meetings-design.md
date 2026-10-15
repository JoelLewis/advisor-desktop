# Phase 5: meeting prep and review

**Date:** 13 October 2026
**Status:** approved in brainstorming, awaiting spec review
**Roadmap:** `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 5)
**Builds on:** Phase 4 (`2026-10-12-phase-4-compliance-review-design.md`), branch `workspace` @ 426445c

## Goal

The Johnson annual review, end to end, driven by one presenter as Adrian Hale. Before the meeting a
Meeting Prep agent measures the household and proposes an agenda; Adrian shapes it. Adrian holds the
meeting (the session clock moves past it and a seeded transcript arrives); a Meeting Notes agent
drafts structured notes citing the transcript; Adrian edits and files them as a recorded act; the
follow-ups become tracked tasks; the Client Letter agent drafts a recap for Robert and Adrian sends
it. Household and client full views carry the dense reference. Robert sees only the recap.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Which meeting | Johnson, prep and review: the annual review moves to this afternoon (Wed 2026-02-25, 14:00–15:15 ET) so one continuous story follows Phases 3–4 |
| How notes come into being | A seeded transcript is the source; a Meeting Notes agent drafts notes citing transcript lines; Adrian edits and files them as a recorded act |
| What follow-ups become | Tracked tasks (owner, trading-day due date) in the team thread, plus a client recap drafted by the Client Letter agent and sent by Adrian. Only decisions and client requests reach the client |
| Where the meeting lives | An internal meeting thread (the conversation) plus a meeting full view `/meetings/:eventId` beside the live thread, workbench-style |
| How the meeting "happens" | **Hold the meeting** advances the event clock to the meeting's end, as fills advance it to the open; prep is timestamped before, notes after |

## Data truth (fixed first)

- `evt-010` "Annual Review — Johnson Household": 2026-02-25 14:00–15:15 (ET, the calendar's local
  time), `householdId: 'hh-001'`, attendees Robert Johnson, Patricia Johnson, Adrian Hale. It sits
  between the Patel planning meeting (13:00) and the Foster prospect call (15:30); no overlap.
- Calendar events gain `householdId?` and `attendees`. No event falls on a weekend (`evt-011`
  Martinez moves to a weekday; `plan-001.nextReviewDate` follows `evt-010`).
- One Johnson IPS story: `doc-001` signed 2025-11-15 is the IPS; `nba-012` ("IPS review overdue",
  last reviewed 2024-09-10) is reworded to the truth or retired; the old handler's "last updated 14
  months ago" goes with the old handler.
- No communication is timestamped after the frozen now (`comm-001` moves earlier; its YTD claim is
  removed — performance figures come from the engine). `comm-009`'s tax-loss figures tie to `rs-001`.
- `comm-014`'s beneficiary discrepancy refers to the held-away Vanguard 401(k) (`ha-001`), not the
  trust.
- The old `/api/calendar/events/:id/prep|notes|follow-ups` generated text (hardcoded fee, YTD,
  "harvestable INTC", generic talking points) is removed or replaced by the engine-backed meeting
  model; nothing on a workspace screen reads it.

## Engine

### Meeting store (session-scoped, reset with the workspace store)

```ts
type TranscriptLine = { id: string; speaker: 'cli-001' | 'cli-002' | 'user-001'; text: string }
type AgendaItem = { id: string; title: string; source: { kind: 'finding'; messageId: string } | { kind: 'advisor' } }
type AgendaVersion = { n: number; items: AgendaItem[]; author: AgentId | string; at: string }
type NoteLine = { id: string; section: 'discussion' | 'decisions' | 'client_requests' | 'follow_ups'; text: string; cites: string[] } // transcript line ids
type MeetingTask = { id: string; title: string; ownerId: string | AgentId; due: string; state: 'open' | 'done'; fromNoteLine: string }
type Meeting = {
  eventId: string; householdId: string; threadId: string
  state: 'scheduled' | 'held' | 'filed'
  agenda: AgendaVersion[]                 // append-only
  heldAt?: { start: string; end: string }
  notesDraft?: NoteLine[]                 // agent draft, then Adrian's edits
  filed?: { actId: string; fingerprint: string; lines: NoteLine[] }
  tasks: MeetingTask[]
}
```

- The transcript (~25 turns by Robert, Patricia and Adrian) is fixture data; it is readable only
  once the meeting is `held`.
- **Hold the meeting** (advisor only): `scheduled → held`; the event clock advances to the meeting's
  end (2026-02-25 15:15 ET, 20:15Z); the thread gets "Meeting held · 14:00–15:15 ET · transcript received".
- Notes can be drafted only when `held`; edits are allowed until filed.

### Agents (scripted, deterministic, digit-free claims, citations required)

| Agent | Where | May | May not |
|---|---|---|---|
| Meeting Prep | meeting thread | measure the household; propose an agenda | file notes; contact the client |
| Meeting Notes | meeting full view / thread | draft notes from the transcript, each line citing transcript lines | file; assign people; add a recommendation nobody made |
| Client Letter (existing) | Robert's thread drafts panel | draft the recap from the filed record | send |

- Meeting Prep measures from the engine: what changed since the last review (the morning's fills,
  the INTC harvest and its recorded window, drift), plan goals with probability and funded status,
  held-away assets (outside wash-sale visibility), open items (the IPS signature state, the
  beneficiary discrepancy), RMD timing for Robert's Traditional IRA. Its agenda is ordered by
  attention.

### Binding acts and tasks

- `file_meeting_record` `{ eventId, fingerprint }` — advisor only (others 403, clients 404); only
  when `held`; once (second → 409); fingerprints the note lines; append-only; appears in the Archive.
- Filing creates the tasks from the `follow_ups` lines: owner and due date (an NYSE trading day from
  the frozen calendar). Owners may be Adrian, Sarah, Mike or an agent; nobody but the presenter acts
  live, so tasks are tracked, not worked.
- The recap is sent with the existing `send_to_client`; its draft is tied to the filing's
  fingerprint (a changed record → stale draft → 409). Mark's correspondence review picks it up.

### Visibility

Transcript, agenda, notes, tasks and the filing are firm only. Robert sees only the recap. Household
and client full views are firm only (client → not found).

### API (viewer-filtered; client viewers get 404)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/workspace/meetings/:eventId` | meeting, agenda, state, notes draft, filing, tasks; transcript when held |
| POST | `/api/workspace/meetings/:eventId/prep` | runs Meeting Prep; posts findings and agenda v1 |
| POST | `/api/workspace/meetings/:eventId/agenda` | `{ items }` → new agenda version (Adrian) |
| POST | `/api/workspace/meetings/:eventId/hold` | holds the meeting |
| POST | `/api/workspace/meetings/:eventId/notes/draft` | runs Meeting Notes |
| PUT | `/api/workspace/meetings/:eventId/notes` | Adrian's edits to the draft |
| POST | `/api/workspace/acts` | `file_meeting_record` added |
| GET | `/api/workspace/households/:id`, `/api/workspace/clients/:id` | full-view read models |

## The meeting's content

| Topic | Source | Notes record | Follow-up (owner, due) |
|---|---|---|---|
| This morning's rebalance and harvest | Phase 3/4 fills; INTC window through 2026-03-27 | Robert understands not to buy INTC back; dividend reinvestment and held-away accounts count | — |
| Legacy goal at risk | plan-001 goal-002 | Patricia wants the legacy goal kept; options at the next review | Mike: plan scenarios (Mon 2026-03-02) |
| Roth conversions before RMDs (Robert's RMDs begin the year he turns 73, 2031) | acc-003, Robert's date of birth | Request to model conversion amounts; estimate, not tax advice; CPA involved | Mike: conversion analysis; Adrian: contact the CPA |
| Consolidating the held-away 401(k) and 403(b) | ha-001, ha-002 | Clients asked; no recommendation made — a rollover recommendation needs a documented best-interest comparison (fees, services, investment options) | Sarah: request plan fee disclosures and statements |
| Beneficiary discrepancy on the Vanguard 401(k) | comm-014 (corrected) | Client to contact the plan administrator; firm sends the beneficiary checklist | Sarah: send the checklist |
| ESG alternatives for the trust | note-001 | Interest recorded; an IPS change needs a signed amendment | Adrian: draft the IPS amendment for the next meeting |
| IPS | doc-001 | Reviewed; no change beyond the ESG item | — |

Guardrails: the notes record what was said and decided, never a recommendation nobody made; a
rollover appears only as "asked about; comparison to follow" (Reg BI, PTE 2020-02); tax items carry
"estimate; consult your tax professional"; the recap states what the clients asked, what was decided
and who does what — no transcript text, no internal note, no colleague's analysis.

## Screens

- **Meeting thread** "Johnson annual review" (internal, subject household hh-001, agents Meeting Prep,
  Meeting Notes). The Brief carries a "meeting at 14:00" line Adrian can take to it. **Run prep**
  posts findings and agenda v1; Adrian reorders, drops, adds or carries findings into the agenda
  (each change a version line). **Hold the meeting**, **Draft notes**, **File the record** in the
  context column for the advisor. After filing: the record slip, then the task list in the context
  column (owner, due, state).
- **Meeting full view** `/meetings/:eventId?from=<threadId>`, side by side with the live thread:
  header (when, where, attendees, state); agenda (current version); household summary (all five
  accounts with values, held-away assets flagged outside the advisor's view, household allocation
  against models with residual reasons, plan goals with probability and funded status, the
  taxpayer's open wash-sale windows, IPS and signature state, open items); after the meeting, the
  transcript beside the notes draft — hovering or focusing a citation highlights its transcript line;
  edits and **File the record** here too (same act).
- **Robert's thread**: the Client Letter agent drafts the recap into the drafts panel; Adrian edits
  and sends. Robert's earlier question ("When is my annual review this year?") is answered by the
  meeting having happened; the recap is the reply.
- **Household full view** `/households/:id`: the household summary, plus documents, recent
  communications, activity, meetings past and upcoming.
- **Client full view** `/clients/:id`: profile, risk assessment and its date, accounts owned, IPS,
  communications.
- Full views link from the thread context, the meeting view and the command line ("Household ·
  Johnson", "Client · Robert Johnson", "Meeting · Johnson annual review").

## Carry-over (optional, taken if they touch these files)

- The Proposal Agent's "buys nothing that would wash one of the taxpayer's losses" reads
  contradictory beside the IRA/Roth caveat; reword.
- The Archive's date selects cannot show a URL date that is not in their list.

## Testing

- **Engine:** meeting state machine (scheduled → held → filed; no notes before held; no double
  filing); file only by the advisor (403 others, 404 clients); append-only filing whose fingerprint
  covers the note lines; every note line cites at least one real transcript line; agent claims
  digit-free; every figure from the engine; due dates on trading days; the recap contains only
  decisions and client requests (no transcript text, no internal note, no colleague-owned task) and
  refuses (409) when the filed record changed; Robert sees exactly one new message; Mark sees the
  recap in Supervision and the filing in the Archive; reset restores the seed.
- **Data truth guards:** no event on a weekend; one IPS date for Johnson; no communication after the
  frozen now; no hardcoded prep text reaches a workspace screen.
- **UI end to end:** Brief line → meeting thread → run prep → edit agenda → meeting full view →
  hold → draft notes → hover a citation → edit → file → tasks → recap draft → send → view as Robert
  (only the recap) → view as Mark (Supervision, Archive) → household and client full views from the
  command line.
- **Visual baselines:** meeting thread; meeting full view before and after holding (light and dark);
  household; client; Robert's thread with the recap.

## Out of scope

- Calendar or video integrations; live transcription; scheduling and rescheduling.
- Patricia as a client viewer (the client thread stays Robert's).
- Working the follow-up tasks (they are tracked, not executed).
- A rollover recommendation (Phase 6 or later).

## Success criteria

- One presenter runs prep → hold → notes → file → recap without leaving the workspace.
- Every figure comes from the engine; every note line cites the transcript.
- Viewing as Robert shows exactly the recap.
