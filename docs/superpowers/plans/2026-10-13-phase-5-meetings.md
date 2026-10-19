# Phase 5: Meeting Prep and Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On branch `workspace`, run the Johnson annual review end to end as one presenter (Adrian Hale): a Meeting Prep agent measures the household and proposes an agenda, Adrian shapes it, holds the meeting (the session clock moves to its end and a seeded transcript arrives), a Meeting Notes agent drafts notes that cite the transcript, Adrian edits and files them as a binding act, the follow-ups become tracked tasks on NYSE trading days, the Client Letter Agent drafts a recap tied to the filing, Adrian sends it, Robert sees only the recap, Mark sees it in Supervision and the filing in the Archive, and household and client full views carry the reference.

**Architecture:** A session-scoped meeting store (`meetings` inside the workspace store, so `resetWorkspaceStore` resets it) holds each meeting's state machine (`scheduled → held → filed`), its append-only agenda versions, the notes draft, the filing and the tasks. Engine modules under `src/mocks/workspace/` own the transitions (`meetings.ts`), the two new scripted agents' orchestration (`meeting-agents.ts`), the binding act (`meeting-acts.ts`) and the recap (`recap.ts`); the agents themselves live in `src/mocks/agents/` beside the existing ones and read only the engine. Household and client read models (`household-views.ts`) feed new firm-only endpoints, and the UI adds a meeting panel in the thread's context column, a meeting full view beside the live thread (workbench-style), household and client full views, Brief and command-line entry points, and a recap control in Robert's drafts panel.

**Tech Stack:** React 18, TypeScript strict, Vite 6, Tailwind v4, TanStack Query 5, React Router 6 (v7 future flags), MSW 2, Vitest 4 + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-phase-5-meetings-design.md` (binding). Earlier contracts: `docs/superpowers/specs/2026-10-12-phase-4-compliance-review-design.md`, `docs/superpowers/specs/2026-10-11-workspace-roadmap.md` (phase 5), and the Phase 4 SDD ledger rulings (wording, provenance, client confidentiality, presenter rules).

## Global Constraints

- Work only on branch `workspace` (base `8ec6d21` or a later `workspace` commit containing every task this one depends on — check `git log --oneline -1` before starting and report BLOCKED if a prerequisite task's commit is missing). Never commit to `main`. Push only when the controller says so.
- Strict TypeScript; no `any` (use `unknown` and narrow); `type` over `interface`; no enums; ESM; no barrel files. `.tsx` files export only components; helpers and types go in `.ts` siblings. On macOS's case-insensitive filesystem never place `foo.ts` next to `Foo.tsx`. Errors are explicit types or explicit `throw new Error(...)` naming the broken invariant, never silent catches or silent fallbacks.
- The machine is shared and loaded. Scoped tests: `pnpm vitest run <path> --testTimeout 30000`. Once per task, at the end: `pnpm vitest run --testTimeout 30000`, then `pnpm lint` (`--max-warnings 0`) and `pnpm build`. A full-suite timeout under load is CPU contention from sibling suites (check `uptime`); rerun before debugging. Restore `tsconfig.tsbuildinfo` / `wrangler.jsonc` with `git checkout --` if a tool modifies them. Never symlink `node_modules` between worktrees.
- Visual tests: `VISUAL_PORT=5195 pnpm visual`. Baselines are exact (`maxDiffPixels: 0`). Task 2 adds the meeting thread to every firm viewer's thread list and two agents to the Desk pane, so every existing baseline that shows the shell drifts from those tasks onward; Task 15 regenerates and reviews all of them (`VISUAL_PORT=5195 pnpm visual:update`, then the implementer opens and looks at every PNG it rewrote). Tasks 1–14 do not run `pnpm visual`.
- Frozen today `2026-02-25` (`MOCK_TODAY_ISO`, a Wednesday), frozen now `2026-02-25T12:00:00Z` (`MOCK_NOW_ISO`). Never read the live clock (`new Date()` / `Date.now()` are banned in `src/mocks` by test; `new Date(<string>)` is fine). Recorded times come from the event clock (`nextAt()`, `eventTime(sequence)`): one minute per event from the frozen now. Phase 4 fills wait for the NYSE open, `2026-02-25T14:30:00.000Z`. Eastern Time is UTC−5 throughout the fixtures' February and early March (daylight time starts 2026-03-08).
- The meeting: `evt-010` "Annual Review — Johnson Household", 2026-02-25 14:00–15:15 ET = `2026-02-25T19:00:00.000Z`–`2026-02-25T20:15:00.000Z`, household `hh-001`, attendees `cli-001` Robert Johnson, `cli-002` Patricia Johnson, `user-001` Adrian Hale, location "Office — Main". Its thread is `th-johnson-meeting`, titled "Johnson annual review". **Hold the meeting** moves the event clock to the meeting's end (sequence 495 = `2026-02-25T20:15:00.000Z`); the clock never runs backwards.
- Household `hh-001`: Robert `cli-001` (born 1958-03-22, first RMD year 2031 at age 73), Patricia `cli-002` (born 1960-07-11); managed accounts `acc-001`..`acc-005` sum $18,750,000; held away `ha-001` Vanguard 401(k) $2,400,000 (Robert), `ha-002` TIAA 403(b) $1,500,000 (Patricia); `plan-001` goal-002 "Legacy / Estate" at risk, probability 0.78; `doc-001` "Johnson Family Trust — IPS" signed 2025-11-15. The INTC harvest `rs-001`: 5,000 INTC sold 2026-02-20, −$32,750 long-term, window through 2026-03-22; the Phase 4 release's sale `rs-006` window runs through 2026-03-27.
- Every displayed figure comes from the engine; the UI never computes a figure and formats only through `src/kit/measure.ts` (times in Eastern Time through the new `fmtEasternTime` / `fmtEasternRange`). Agent claims, agenda titles, note-line text and transcript text contain no digits, except the plan names `401(k)` and `403(b)`. Act summaries, record ids, citations, fills and task due dates are records, not claims: digits allowed.
- UI uses only kit components (`src/kit/`) for buttons, tables, dialogs, inputs, selects and checkboxes, and only instrument colour tokens. The guardrails in `src/__tests__/guardrails/` stay green.
- No real person's name. Adrian Hale `user-001` (advisor, the one presenter), Sarah Mitchell `user-002` (client service), Mike Chen `user-003` (analyst), Mark Davis `cco-001` (compliance), Robert Johnson `cli-001` (client viewer), Patricia Johnson `cli-002` (a client and a meeting attendee, never a viewer). Nobody but the presenter acts live: tasks owned by Sarah, Mike or an agent are tracked, never worked; Mark's views are reached through "View as".
- Visibility words exactly: "Only you" / "Firm only · client can't see" / "CLIENT CAN SEE". Transcript, agenda, notes, tasks and the filing are firm only. Robert sees only the recap. Client viewers get `404` from every meeting, household, client and recap endpoint and from `file_meeting_record`, and the pages show "not found".
- Domain wording, exactly: never "cleared" (new text); never "would exceed" for an approaching limit; wash-sale scope is the **taxpayer** (owner and spouse, IRAs and Roths included), never "household"; a window is stated "through <date>"; a rollover appears only as "asked about; comparison to follow" (Reg BI, PTE 2020-02) and nothing recommends one; tax items carry "estimate; consult your tax professional"; the notes record what was said and decided, never a recommendation nobody made; the recap carries only decisions and client requests (no transcript text, no discussion line, no internal note, no follow-up task, no colleague's name).
- Task due dates are NYSE trading days from `src/lib/trading-calendar.ts`.
- Separation of duties: only the advisor (`prepare_meeting`, `file_meeting_record`) runs prep, edits the agenda, holds the meeting, drafts and edits notes and files the record; other firm viewers get `403 NOT_PERMITTED`. Acts are append-only: nothing edits or deletes a recorded act or a filed record (the `405` catch-all stays last).
- Commit messages end with the Co-Authored-By trailer naming the model that wrote the commit (the Phase 4 standing rule: `Co-Authored-By: Claude <that model's name> <noreply@anthropic.com>`, e.g. Sonnet for an implementer, Opus for the controller).

## Review Focus

1. **A repeated or crossing write.** Adrian double-clicks Confirm on **File the record**, or files from the meeting view while the context panel's confirm is open; double-clicks **Hold the meeting** or **Run prep**: the engine records one `file_meeting_record` act, one set of tasks and one tasks message; the second filing answers `409 ALREADY_FILED` naming the first act; a second hold answers `409 ALREADY_HELD` and the clock moved once; a second prep returns the same findings and no second agenda v1. Tests: Task 3 (hold), Task 4 (prep), Task 6 (filing), Tasks 10–12 (UI double clicks).
2. **Notes that moved after they were read.** Adrian saves an edit in the meeting view after the context panel loaded the fingerprint, then files from the panel: `409 FINGERPRINT_MISMATCH`, nothing filed, the panel refetches; in the meeting view, unsaved edits keep **File the record** disabled with the reason "Save your edits before filing." Tests: Task 6 (engine), Task 12 (UI).
3. **A malformed note line.** A line whose citations are empty or name a transcript line that does not exist, blank or padded text, more than 2,000 characters, an unknown section, a follow-up without an owner or with a weekend or pre-meeting due date, a line id that is not in the draft: `400` with its code, the draft unchanged. Tests: Task 5 (engine), Task 9 (HTTP shape).
4. **A client probing the meeting.** Robert requests `/api/workspace/meetings`, `/meetings/evt-010`, any meeting write, `/households/hh-001`, `/clients/cli-002`, the recap endpoint or posts `file_meeting_record`, or opens `/meetings/evt-010`, `/households/hh-001`, `/clients/cli-001`: `404` / "not found", never content; his thread gains exactly one message (the recap) and its slip, and nothing in it names the transcript, the notes, a task, Sarah or Mike. Tests: Task 9 (HTTP), Task 7 (engine), Task 13 (pages), Task 14 (thread).
5. **Steps out of the story's order.** Hold before prep (allowed: the agenda stays empty and the view says so); prep or an agenda edit after the meeting is held (`409 MEETING_HELD`); notes before the meeting is held (`409 NOT_HELD`, the transcript not served); a recap before filing (`409 NOT_FILED`, the control disabled with "File the record of the Johnson annual review first."); holding after fills or before them (the held line is at 20:15 UTC unless the clock is already later, never earlier). Tests: Task 3, Task 4, Task 5, Task 7, Task 14.

## Rulings on the spec

These close gaps the spec leaves open; each task below implements them.

- **Event times state their offset.** Calendar `startTime`/`endTime` become `2026-02-25T14:00:00-05:00` style (Eastern, explicit offset) so `measure.ts` can parse them; the engine converts to UTC (`new Date(local).toISOString()`).
- **`evt-011`** (Sunday 2026-03-01, "Birthday Call — Michael Martinez") is also untrue — his birthday is 7 December (nba-009) — so it becomes "Check-in Call — Michael Martinez" on Monday 2026-03-02 09:00–09:15 ET. `plan-001.nextReviewDate` becomes `2026-02-25`, the date of `evt-010`.
- **`nba-012` is reworded to the truth**, not retired (three tests pin twenty NBAs): "Annual review today — Johnson Household", citing the IPS signed on 2025-11-15 and the firm policy. `comm-001` moves to 2026-02-24T17:30:00Z and drops the YTD and benchmark claims; `comm-009` moves to 2026-02-20T16:00:00Z, after the sale it reports, and states rs-001's quantity, loss and window; `comm-014` names the held-away Vanguard 401(k).
- **Author and owner types.** The spec's `author: AgentId | string` and `ownerId: string | AgentId` become the existing discriminated `VersionAuthor` (`{ kind: 'agent'; agentId } | { kind: 'person'; personId }`), aliased `TaskOwner`.
- **Follow-up owners and due dates live on the note line.** `NoteLine` gains `owner?` and `due?` (follow-ups only). The Meeting Notes agent records an owner only where the transcript states one, citing that line (it never chooses one — its "may not assign people"); due dates are the script's trading-day offsets from the meeting day. Filing turns each filed follow-up line into a task.
- **Permissions.** New `Act` `prepare_meeting` (prep, agenda, hold, draft and edit notes) and binding act `file_meeting_record`, both advisor only.
- **Prep and agenda close when the meeting is held**; notes can be drafted once (a second request returns the current draft, keeping Adrian's edits); a prep repeated with the same run key returns its findings; agenda v1 is posted only when the agenda is empty.
- **Endpoints the spec's table implies but does not list:** `GET /api/workspace/meetings` (the viewer's meetings, for the command line and the recap control) and `POST /api/workspace/threads/:id/drafts/recap` `{ eventId }` (the Client Letter Agent's recap).
- **Recap provenance.** Drafts and send acts gain `recordBasis: { eventId, actId, fingerprint }` beside the proposal `basis`; a recap is stale when the meeting's filing no longer matches it, and `send_to_client` refuses a stale one with `409 STALE_DRAFT`. A filed record cannot change through the API, so the stale path is pinned with a recap whose basis names another fingerprint.
- **"Only decisions and client requests reach the client".** The recap lists the filed `client_requests` and `decisions` lines, verbatim as filed (so Adrian's edits reach it), under "What you asked us" and "What we decided"; "who does what" is carried inside those lines in the firm's voice ("we will…", "Robert will…"); no follow-up task or colleague name appears.
- **The Brief line and carry.** The Brief gets a seeded `meeting_notice` message ("Meeting at 14:00 ET · Johnson annual review") linking to the meeting thread; the Brief's existing "Take to …" control also offers the meeting thread whose household holds the Brief's account, so Adrian can carry a Brief finding into the meeting thread and from there into the agenda.
- **Transcript speakers** are resolved from the meeting's attendee list (the engine names Patricia from the CRM), so Patricia never joins the workspace directory or "View as".
- **Residual reasons in the household summary** are only the structural ones the engine can state without a proposal (`not_market_tradable`, `replacement_hold`); other out-of-band classes show the drift and band alone.

## Task order, shared contracts and parallelism

| Task | Depends on | Shares files or types with | May run in parallel with |
|---|---|---|---|
| 1 Data truth: calendar, plan, NBA, communications; old prep text removed | — | `calendar.ts` (data, types; Tasks 3, 8), `planning.ts`, `nbas.ts`, `client-comms.ts`, `handlers/calendar.ts`, `services/calendar.ts` | — |
| 2 Meeting types, agent profiles, permissions, store, seed thread, message views | 1 | `src/types/workspace.ts` and `workspace-meeting.ts` (read by every later task), `people.ts`, `workspace-store.ts`, `workspace-seed.ts`, `MessageView.tsx`, `CompactMessage.tsx`, `measure.ts`, `full-view-href.ts` (Tasks 11–13) | — |
| 3 Transcript, meeting read model, hold, agenda versions | 2 | `meetings.ts` (Tasks 4–8), `meeting-transcripts.ts` (Task 5) | — |
| 4 Meeting Prep agent and prep | 3 | `agents/meeting-prep.ts`, `meeting-agents.ts` (Task 5), `open-items.ts` (Task 8), `figure-format.ts`, `lib/rmd.ts` (Task 8) | — |
| 5 Meeting Notes agent, draft and edits | 4 | `agents/meeting-notes.ts`, `meeting-agents.ts`, `meetings.ts`, `trading-calendar.ts` | 8 |
| 6 `file_meeting_record`, tasks, archive | 5 | `meeting-acts.ts`, `archive.ts`, `workspace-supervision.ts` types, `act-kind-label.ts` | 8 |
| 7 The recap: Client Letter Agent, staleness, send | 6 | `recap.ts`, `agents/meeting-recap.ts`, `draft-staleness.ts`, `letters.ts`, `acts.ts`; `recordBasis` read by `draft-origin.ts` (Task 14) and stripped for clients in `handlers/workspace.ts` (Task 9) | 8 |
| 8 Household and client read models | 4 | `household-views.ts`, `workspace-household.ts` types; reads `open-items.ts` from Task 4 | 5–7 |
| 9 HTTP endpoints, services, hooks | 7, 8 | `handlers/workspace-meetings.ts`, `handlers/workspace.ts`, `services/workspace.ts`, `services/api-client.ts`, `hooks/use-meetings.ts`, `hooks/use-workspace.ts` | — |
| 10 Shared meeting UI pieces | 9 | `src/workspace/meeting/*` (Tasks 11, 12), `src/workspace/household/*` (Tasks 12, 13) | — |
| 11 Meeting thread: context panel, Brief line, carry | 10 | `ContextColumn.tsx`, `FullViews.tsx`, `CarryControl.tsx`, `carry-targets.ts` | — |
| 12 Meeting full view beside the live thread | 11 | `routes.tsx` (Task 13), `MeetingPage.tsx`, `LiveThreadFeed.tsx`, `WorkbenchThreadColumn.tsx` | — |
| 13 Household and client full views, command line | 12 | `routes.tsx`, `use-destinations.ts`, `shell-keyboard.test.tsx`, `household-words.ts` | 14 |
| 14 Robert's recap: drafts panel, provenance, Robert and Mark | 11 | `DraftsPanel.tsx`, `RecapControl.tsx`, `draft-origin.ts` (read by `CorrespondenceEvidence.tsx` and `ActRecordSlip.tsx`) | 13 |
| 15 Carry-overs, end-to-end story, visual baselines | all | `proposal-agent.ts`, `ArchivePage.tsx`, `e2e-visual/*` | — |

Everything not in the last column is serial. Parallel tasks run in separate worktrees created from a commit that already contains all of their prerequisites; merge them one at a time with the full suite green between merges. Disjoint file lists are not independence: Task 8 reads the open items Task 4 creates, and Tasks 5–7 all append to `meetings.ts` / `meeting-agents.ts` serially. The controller may run everything serially in one checkout instead (the Phase 4 ruling P10).

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/types/calendar.ts`, `src/mocks/data/calendar.ts` | 1 | events with offset times, `householdId`, `attendees`; old prep/notes/follow-up types gone |
| `src/mocks/handlers/calendar.ts`, `src/services/calendar.ts`, `src/hooks/use-schedule.ts`, `src/hooks/use-meeting-notes.ts` (deleted) | 1 | events and schedule only; generated prep text removed |
| `src/mocks/data/planning.ts`, `nbas.ts`, `client-comms.ts`, `src/mocks/data/__tests__/nba-facts.test.ts` | 1 | one IPS story, no communication after now, figures tied to the engine |
| `src/mocks/data/__tests__/meeting-data-truth.test.ts` (new) | 1 | the data-truth guards |
| `src/types/workspace.ts`, `src/types/workspace-meeting.ts` (new) | 2 | agent ids and outputs, acts, `RecordBasis`, `meeting` subject, five message kinds; meeting, agenda, note, task and view types |
| `src/mocks/data/people.ts`, `src/mocks/data/workspace-store.ts`, `src/mocks/data/workspace-seed.ts` | 2 | agent profiles, permissions, `meetings` state and counters, the meeting thread, the Brief notice, the seeded meeting |
| `src/kit/measure.ts` | 2 | `fmtEasternTime`, `fmtEasternRange` |
| `src/workspace/thread/MeetingNoticeView.tsx`, `AgendaVersionLine.tsx`, `MeetingHeldLine.tsx`, `NotesDraftedLine.tsx`, `MeetingTasksView.tsx` (new), `MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx`, `src/workspace/full-views/full-view-href.ts` | 2 | the new message kinds in the thread and the live thread |
| `src/mocks/data/meeting-transcripts.ts` (new), `src/mocks/workspace/meetings.ts` (new) | 3 | the transcript fixture; lookup, visibility, read model, hold, agenda versions, notes fingerprint |
| `src/mocks/agents/meeting-prep.ts` (new), `src/mocks/data/open-items.ts` (new), `src/lib/rmd.ts` (new), `src/mocks/workspace/meeting-agents.ts` (new), `src/workspace/thread/figure-format.ts` | 4 | the Meeting Prep agent, its open items and RMD rule, prep and agenda v1 |
| `src/mocks/agents/meeting-notes.ts` (new), `src/lib/trading-calendar.ts`, `meetings.ts`, `meeting-agents.ts` | 5 | the Meeting Notes agent, notes draft and edits |
| `src/mocks/workspace/meeting-acts.ts` (new), `archive.ts`, `src/types/workspace-supervision.ts`, `src/workspace/thread/act-kind-label.ts` | 6 | filing, tasks, the archive's client for a meeting act |
| `src/mocks/agents/meeting-recap.ts` (new), `src/mocks/workspace/recap.ts` (new), `draft-staleness.ts` (new), `letters.ts`, `acts.ts` | 7 | the recap, its staleness, its send |
| `src/types/workspace-household.ts` (new), `src/mocks/workspace/household-views.ts` (new) | 8 | household summary and view, client view |
| `src/mocks/handlers/workspace-meetings.ts` (new), `workspace.ts`, `src/services/api-client.ts`, `src/services/workspace.ts`, `src/hooks/use-meetings.ts` (new), `src/hooks/use-workspace.ts` | 9 | endpoints, client functions, hooks |
| `src/workspace/meeting/*` (new), `src/workspace/household/*` (new) | 10 | controls, agenda editor, task table, household summary panes |
| `src/workspace/context/ContextColumn.tsx`, `FullViews.tsx`, `MeetingPanel.tsx` (new), `src/workspace/thread/CarryControl.tsx`, `carry-targets.ts` (new) | 11 | the meeting thread's context; the Brief's carry to it |
| `src/app/routes.tsx`, `src/workspace/meeting/MeetingPage.tsx`, `MeetingThreadColumn.tsx`, `use-meeting-thread-available.ts`, `TranscriptNotes.tsx`, `NotesEditor.tsx`, `src/workspace/thread/LiveThreadFeed.tsx` (new), `src/workspace/workbench/WorkbenchThreadColumn.tsx` | 12 | the meeting full view |
| `src/workspace/full-views/HouseholdView.tsx`, `ClientView.tsx` (new), `src/app/use-destinations.ts` | 13 | household and client full views; destinations |
| `src/workspace/context/DraftsPanel.tsx`, `RecapControl.tsx` (new), `draft-origin.ts` | 14 | the recap in Robert's drafts panel; its provenance |
| `src/mocks/agents/proposal-agent.ts`, `src/workspace/archive/ArchivePage.tsx`, `e2e-visual/workspace-steps.ts`, `meeting-review.spec.ts` (new) | 15 | carry-overs; the story and its baselines |

---
### Task 1: Data truth — the calendar, the plan, the IPS story, the communications; the old prep text removed

The fixtures the meeting reads must be true before anything reads them: the Johnson review moves to this afternoon, events state their offset and their household, no event falls on a weekend, one IPS date, no communication after the frozen now, `comm-009` and `comm-014` tied to the engine's records, and the old calendar handler's generated prep text (hardcoded fee, YTD, "harvestable INTC") is gone with its services, hooks and types.

**Files:**
- Modify: `src/types/calendar.ts`, `src/mocks/data/calendar.ts`, `src/mocks/handlers/calendar.ts`, `src/services/calendar.ts`, `src/hooks/use-schedule.ts`, `src/mocks/data/planning.ts:6`, `src/mocks/data/nbas.ts:434-456`, `src/mocks/data/client-comms.ts` (`comm-001`, `comm-009`, `comm-014`), `src/mocks/data/__tests__/nba-facts.test.ts:222-226`
- Delete: `src/hooks/use-meeting-notes.ts`
- Test: `src/mocks/data/__tests__/meeting-data-truth.test.ts` (new)

**Interfaces:**
- Consumes: `MOCK_NOW_ISO` from `@/lib/clock`; fixtures `calendarEvents`, `plans`, `nbas`, `notes`, `clientComms`, `documents`, `realisedSales`, `clients`.
- Produces (later tasks rely on these exactly):

```ts
// src/types/calendar.ts
export type CalendarEvent = {
  id: string; title: string; clientId?: string; clientName?: string; meetingType: MeetingType
  /** Eastern local time with its offset, e.g. 2026-02-25T14:00:00-05:00. */
  startTime: string; endTime: string
  location?: string; notes?: string; prepCompleted: boolean
  /** The client's household, on every event with a client. */
  householdId?: string
  /** Person and client ids: the client and household members invited, and the firm's people. */
  attendees: string[]
}
// MeetingPrep, MeetingPrepItem, MeetingNote, MeetingNoteSection and MeetingFollowUp are deleted.
// src/services/calendar.ts keeps only getEvents and getSchedule; src/hooks/use-schedule.ts keeps only useSchedule.
```

- [ ] **Step 1: Write the failing guards**

Create `src/mocks/data/__tests__/meeting-data-truth.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { calendarEvents } from '@/mocks/data/calendar'
import { plans } from '@/mocks/data/planning'
import { nbas } from '@/mocks/data/nbas'
import { notes } from '@/mocks/data/notes'
import { clientComms } from '@/mocks/data/client-comms'
import { documents } from '@/mocks/data/documents'
import { realisedSales } from '@/mocks/data/realised-sales'
import { clients } from '@/mocks/data/clients'
import { MOCK_NOW_ISO } from '@/lib/clock'

const OFFSET_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/
const weekdayOf = (local: string) => new Date(`${local.slice(0, 10)}T00:00:00Z`).getUTCDay()
const JOHNSONS: ReadonlySet<string> = new Set(['cli-001', 'cli-002'])
const evt010 = () => {
  const event = calendarEvents.find((e) => e.id === 'evt-010')
  if (!event) throw new Error('evt-010 is missing')
  return event
}

describe('the calendar', () => {
  it('states every time in Eastern Time with its offset, each event ending after it starts', () => {
    for (const e of calendarEvents) {
      expect(e.startTime, e.id).toMatch(OFFSET_TIME)
      expect(e.endTime, e.id).toMatch(OFFSET_TIME)
      expect(Date.parse(e.endTime), e.id).toBeGreaterThan(Date.parse(e.startTime))
    }
  })

  it('puts no event on a weekend', () => {
    for (const e of calendarEvents) expect([0, 6], `${e.id} ${e.startTime}`).not.toContain(weekdayOf(e.startTime))
  })

  it('holds the Johnson annual review this afternoon, between the Patel call and the Foster meeting, overlapping nothing', () => {
    expect(evt010()).toMatchObject({
      title: 'Annual Review — Johnson Household', clientId: 'cli-001', householdId: 'hh-001', meetingType: 'annual_review',
      startTime: '2026-02-25T14:00:00-05:00', endTime: '2026-02-25T15:15:00-05:00', location: 'Office — Main',
      attendees: ['cli-001', 'cli-002', 'user-001'],
    })
    expect(new Date(evt010().startTime).toISOString()).toBe('2026-02-25T19:00:00.000Z')
    expect(new Date(evt010().endTime).toISOString()).toBe('2026-02-25T20:15:00.000Z')
    const today = calendarEvents.filter((e) => e.startTime.startsWith('2026-02-25')).sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    expect(today.map((e) => e.id)).toEqual(['evt-001', 'evt-002', 'evt-003', 'evt-010', 'evt-004'])
    for (let i = 1; i < today.length; i++) expect(Date.parse(today[i - 1]!.endTime)).toBeLessThanOrEqual(Date.parse(today[i]!.startTime))
  })

  it("names each client event's household and invites its client", () => {
    for (const e of calendarEvents.filter((x) => x.clientId !== undefined)) {
      const client = clients.find((c) => c.id === e.clientId)
      expect(e.householdId, e.id).toBe(client?.householdId)
      expect(e.attendees, e.id).toContain(e.clientId)
    }
  })

  it("dates the Johnson plan's next review to the annual review", () => {
    expect(plans.find((p) => p.id === 'plan-001')?.nextReviewDate).toBe(evt010().startTime.slice(0, 10))
  })
})

describe('one Johnson IPS story', () => {
  it('the IPS on file is doc-001, signed on 2025-11-15', () => {
    expect(documents.find((d) => d.id === 'doc-001')).toMatchObject({ type: 'ips', signatureStatus: 'signed', createdAt: '2025-11-15T10:00:00Z' })
  })

  it('nothing about the Johnsons calls the IPS review overdue or dates it to any other day', () => {
    const texts = [
      ...nbas.filter((n) => n.clients.some((c) => JOHNSONS.has(c.id)))
        .flatMap((n) => [n.title, n.description, n.trigger.value, ...(n.complianceInfo?.auditTrail ?? []).map((a) => a.note ?? '')]),
      ...notes.filter((n) => JOHNSONS.has(n.clientId)).map((n) => n.content),
      ...clientComms.filter((c) => JOHNSONS.has(c.clientId)).map((c) => c.summary),
    ]
    for (const text of texts.filter((t) => /\bIPS\b|investment policy/i.test(t))) {
      expect(text).not.toMatch(/overdue/i)
      for (const date of text.match(/\d{4}-\d{2}-\d{2}/g) ?? []) expect(['2025-11-15', '2026-02-25'], text).toContain(date)
    }
  })

  it('nba-012 states the signed IPS and attributes the annual cadence to firm policy', () => {
    const nba = nbas.find((n) => n.id === 'nba-012')
    expect(nba?.title).toBe('Annual review today — Johnson Household')
    expect(nba?.description).toBe('The Johnson Family Trust IPS was signed on 2025-11-15. Firm policy requires an annual IPS review; it is on the agenda for the annual review on 2026-02-25.')
  })
})

describe('client communications', () => {
  it('none is timestamped after the frozen now', () => {
    for (const c of clientComms) expect(Date.parse(c.timestamp), c.id).toBeLessThanOrEqual(Date.parse(MOCK_NOW_ISO))
  })

  it('comm-001 states no performance figure; performance comes from the engine', () => {
    const comm = clientComms.find((c) => c.id === 'comm-001')
    expect(comm?.summary).not.toMatch(/%|YTD|benchmark|outperform/i)
  })

  it("comm-009 reports rs-001: its quantity, its loss and its window, after the sale", () => {
    const comm = clientComms.find((c) => c.id === 'comm-009')
    const sale = realisedSales.find((s) => s.id === 'rs-001')
    if (!comm || !sale) throw new Error('comm-009 and rs-001 are fixtures')
    expect(comm.summary).toContain(`${sale.quantity.toLocaleString('en-US')} INTC`)
    expect(comm.summary).toContain(`$${Math.abs(sale.realisedGainLoss).toLocaleString('en-US')} long-term loss`)
    expect(comm.summary).toContain('through March 22')
    expect(comm.timestamp.slice(0, 10) >= sale.saleDate).toBe(true)
  })

  it("comm-014's beneficiary discrepancy is on the held-away Vanguard 401(k), not a trust designation", () => {
    const comm = clientComms.find((c) => c.id === 'comm-014')
    expect(comm?.summary).toContain('Vanguard 401(k)')
    expect(comm?.summary).not.toMatch(/trust designation/i)
  })
})

describe('no generated prep text reaches the product', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? (name === '__tests__' ? [] : walk(path)) : [path]
  })
  const sources = walk(join(process.cwd(), 'src')).filter((f) => /\.(ts|tsx)$/.test(f))

  it.each([
    'Current advisory fee is 0.85%', '14 months ago', 'harvestable losses identified in INTC',
    'returned +12.4% over the past 12 months', 'Monte Carlo probability at 87%',
  ])('no source file contains "%s"', (text) => {
    expect(sources.filter((f) => readFileSync(f, 'utf8').includes(text))).toEqual([])
  })

  it('the calendar handler serves events and the schedule only', () => {
    const handler = readFileSync(join(process.cwd(), 'src/mocks/handlers/calendar.ts'), 'utf8')
    expect(handler).not.toMatch(/\/prep|\/notes|\/follow-ups/)
  })
})
```

In `src/mocks/data/__tests__/nba-facts.test.ts`, replace the `nba-012` case (lines 222–226) with:

```ts
  it('nba-012 attributes the annual IPS review cadence to firm policy, not the SEC', () => {
    const nba = nbas.find((n) => n.id === 'nba-012')!
    expect(nba.description).not.toContain('SEC best practice')
    expect(nba.description).toContain('Firm policy requires an annual IPS review')
    expect(nba.description).not.toContain('2024-09-10')
  })
```

- [ ] **Step 2: Run the guards to verify they fail**

Run: `pnpm vitest run src/mocks/data/__tests__/meeting-data-truth.test.ts src/mocks/data/__tests__/nba-facts.test.ts --testTimeout 30000`
Expected: FAIL — offset-less times, evt-010 on 2026-03-01, evt-011 on a Sunday, nba-012 "overdue", comm-001 after the frozen now, the calendar handler's `/prep`.

- [ ] **Step 3: The calendar types**

Replace `src/types/calendar.ts` with:

```ts
export type MeetingType =
  | 'annual_review'
  | 'quarterly_review'
  | 'planning'
  | 'prospect'
  | 'internal'
  | 'ad_hoc'

export type ScheduleView = 'day' | 'week' | 'agenda'

export type CalendarEvent = {
  id: string
  title: string
  clientId?: string
  clientName?: string
  meetingType: MeetingType
  /** Eastern local time with its offset, e.g. 2026-02-25T14:00:00-05:00. */
  startTime: string
  endTime: string
  location?: string
  notes?: string
  prepCompleted: boolean
  /** The client's household, on every event with a client. */
  householdId?: string
  /** Person and client ids: the client and household members invited, and the firm's people. */
  attendees: string[]
}
```

- [ ] **Step 4: The events**

Replace `src/mocks/data/calendar.ts` with:

```ts
import type { CalendarEvent } from '@/types/calendar'

/**
 * The advisor's calendar around the frozen today (Wednesday 2026-02-25), in Eastern Time with the
 * offset stated (UTC−5 until daylight time starts on 2026-03-08), so every time parses to one instant.
 * Phase 5 · the Johnson annual review is this afternoon, between the Patel call and the Foster
 * meeting; no event falls on a weekend.
 */
export const calendarEvents: CalendarEvent[] = [
  // Today — Wed Feb 25
  {
    id: 'evt-001', title: 'Morning Portfolio Review', meetingType: 'internal',
    startTime: '2026-02-25T08:30:00-05:00', endTime: '2026-02-25T09:00:00-05:00',
    location: 'Conference Room A', prepCompleted: true, attendees: ['user-001', 'user-002', 'user-003'],
  },
  {
    id: 'evt-002', title: 'Quarterly Review — Anderson Household',
    clientId: 'cli-009', clientName: 'Richard Anderson', householdId: 'hh-006', meetingType: 'quarterly_review',
    startTime: '2026-02-25T10:00:00-05:00', endTime: '2026-02-25T11:00:00-05:00',
    location: 'Office — Main', notes: 'Discuss duration mismatch, wire documentation', prepCompleted: false, attendees: ['cli-009', 'user-001'],
  },
  {
    id: 'evt-003', title: 'Planning Call — Raj & Priya Patel',
    clientId: 'cli-011', clientName: 'Raj Patel', householdId: 'hh-007', meetingType: 'planning',
    startTime: '2026-02-25T13:00:00-05:00', endTime: '2026-02-25T14:00:00-05:00',
    location: 'Zoom', notes: 'New baby planning: 529, beneficiaries, insurance', prepCompleted: false, attendees: ['cli-011', 'user-001'],
  },
  {
    id: 'evt-010', title: 'Annual Review — Johnson Household',
    clientId: 'cli-001', clientName: 'Robert Johnson', householdId: 'hh-001', meetingType: 'annual_review',
    startTime: '2026-02-25T14:00:00-05:00', endTime: '2026-02-25T15:15:00-05:00',
    location: 'Office — Main', notes: 'Annual review: portfolio, plan, IPS, open items', prepCompleted: false,
    attendees: ['cli-001', 'cli-002', 'user-001'],
  },
  {
    id: 'evt-004', title: 'Prospect Meeting — Dr. Amanda Foster',
    meetingType: 'prospect',
    startTime: '2026-02-25T15:30:00-05:00', endTime: '2026-02-25T16:30:00-05:00',
    location: 'Coffee — Blue Bottle (Referral from James Thompson)', prepCompleted: false, attendees: ['user-001'],
  },
  // Thu Feb 26
  {
    id: 'evt-005', title: 'Team Standup', meetingType: 'internal',
    startTime: '2026-02-26T09:00:00-05:00', endTime: '2026-02-26T09:30:00-05:00',
    location: 'Conference Room B', prepCompleted: false, attendees: ['user-001', 'user-002', 'user-003'],
  },
  {
    id: 'evt-006', title: 'Semi-Annual Review — Williams Household',
    clientId: 'cli-004', clientName: 'David Williams', householdId: 'hh-003', meetingType: 'quarterly_review',
    startTime: '2026-02-26T11:00:00-05:00', endTime: '2026-02-26T12:00:00-05:00',
    location: 'Office — Main', notes: 'Discuss consolidation of Fidelity 401(k)', prepCompleted: false, attendees: ['cli-004', 'user-001'],
  },
  {
    id: 'evt-007', title: 'RMD Strategy — James Thompson',
    clientId: 'cli-008', clientName: 'James Thompson', householdId: 'hh-005', meetingType: 'planning',
    startTime: '2026-02-26T14:00:00-05:00', endTime: '2026-02-26T15:00:00-05:00',
    location: 'Zoom', notes: 'First RMD strategy; Roth conversion discussion', prepCompleted: false, attendees: ['cli-008', 'user-001'],
  },
  // Fri Feb 27
  {
    id: 'evt-008', title: 'Compliance Training', meetingType: 'internal',
    startTime: '2026-02-27T10:00:00-05:00', endTime: '2026-02-27T11:30:00-05:00',
    location: 'Large Conference Room', prepCompleted: false, attendees: ['user-001', 'user-002', 'user-003', 'cco-001'],
  },
  {
    id: 'evt-009', title: 'Portfolio Review — Margaret Chen',
    clientId: 'cli-003', clientName: 'Margaret Chen', householdId: 'hh-002', meetingType: 'quarterly_review',
    startTime: '2026-02-27T14:00:00-05:00', endTime: '2026-02-27T15:00:00-05:00',
    location: 'Zoom', notes: 'AAPL concentration, wash sale window, ESG interest', prepCompleted: false, attendees: ['cli-003', 'user-001'],
  },
  // Mon Mar 2 — Michael Martinez's birthday is 7 December (nba-009), so this is a check-in, not a birthday call.
  {
    id: 'evt-011', title: 'Check-in Call — Michael Martinez',
    clientId: 'cli-006', clientName: 'Michael Martinez', householdId: 'hh-004', meetingType: 'ad_hoc',
    startTime: '2026-03-02T09:00:00-05:00', endTime: '2026-03-02T09:15:00-05:00',
    notes: 'Quarterly check-in call', prepCompleted: false, attendees: ['cli-006', 'user-001'],
  },
  // Tue Mar 3
  {
    id: 'evt-012', title: 'Ad Hoc — O\'Brien 529 Rebalance Discussion',
    clientId: 'cli-013', clientName: "Brian O'Brien", householdId: 'hh-008', meetingType: 'ad_hoc',
    startTime: '2026-03-03T11:00:00-05:00', endTime: '2026-03-03T11:30:00-05:00',
    location: 'Phone', notes: '529 rebalance overdue, quick call', prepCompleted: false, attendees: ['cli-013', 'user-001'],
  },
  // Thu Mar 5
  {
    id: 'evt-013', title: 'Quarterly Review — Anderson Household (Follow-up)',
    clientId: 'cli-009', clientName: 'Richard Anderson', householdId: 'hh-006', meetingType: 'quarterly_review',
    startTime: '2026-03-05T10:00:00-05:00', endTime: '2026-03-05T11:00:00-05:00',
    location: 'Office — Main', notes: 'Follow-up from Feb 25 meeting', prepCompleted: false, attendees: ['cli-009', 'user-001'],
  },
]
```

- [ ] **Step 5: The calendar handler, service and hooks keep only events and the schedule**

Replace `src/mocks/handlers/calendar.ts` with:

```ts
import { http, HttpResponse } from 'msw'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { calendarEvents } from '../data/calendar'

/**
 * The calendar's events and one day's schedule. Phase 5 · the generated prep, notes and follow-up
 * endpoints are gone: meeting prep and review are the workspace's meeting model, read from the engine.
 */
export const calendarHandlers = [
  http.get('/api/calendar/events', ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let events = [...calendarEvents]
    if (from) events = events.filter((e) => e.startTime >= from)
    if (to) events = events.filter((e) => e.startTime <= to)
    return HttpResponse.json(events)
  }),

  http.get('/api/calendar/schedule', ({ request }) => {
    const date = new URL(request.url).searchParams.get('date') ?? MOCK_TODAY_ISO
    return HttpResponse.json(calendarEvents.filter((e) => e.startTime.startsWith(date)))
  }),
]
```

Replace `src/services/calendar.ts` with:

```ts
import { get } from './api-client'
import type { CalendarEvent } from '@/types/calendar'

export function getEvents(params?: Record<string, string>) {
  return get<CalendarEvent[]>('/calendar/events', params)
}

export function getSchedule(date: string) {
  return get<CalendarEvent[]>('/calendar/schedule', { date })
}
```

Replace `src/hooks/use-schedule.ts` with:

```ts
import { useQuery } from '@tanstack/react-query'
import { getSchedule } from '@/services/calendar'

export function useSchedule(date: string) {
  return useQuery({
    queryKey: ['schedule', date],
    queryFn: () => getSchedule(date),
  })
}
```

Delete `src/hooks/use-meeting-notes.ts`:

```bash
git rm src/hooks/use-meeting-notes.ts
```

Then confirm nothing still imports what was removed:

Run: `grep -rn "MeetingPrep\|MeetingNote\|MeetingFollowUp\|getMeetingPrep\|use-meeting-notes" src`
Expected: no output.

- [ ] **Step 6: The plan, the NBA and the communications**

In `src/mocks/data/planning.ts`, `plan-001`: `nextReviewDate: '2026-03-01'` → `nextReviewDate: '2026-02-25'`.

In `src/mocks/data/nbas.ts`, replace the whole `nba-012` object (lines 434–456) with:

```ts
  {
    id: 'nba-012', title: 'Annual review today — Johnson Household',
    // Phase 5 · one IPS story: the IPS on file (doc-001) was signed on 2025-11-15, and its annual review
    // is on the agenda of today's annual review (evt-010). The old "last reviewed 2024-09-10, over 17
    // months ago" contradicted the signed document. Terminology · the cadence is firm policy, not an SEC rule.
    description: 'The Johnson Family Trust IPS was signed on 2025-11-15. Firm policy requires an annual IPS review; it is on the agenda for the annual review on 2026-02-25.',
    category: 'compliance', priority: 'medium',
    scoring: { urgency: 65, impact: 45, efficiency: 55, relationship: 50, confidence: 90, composite: 60 },
    clients: [{ id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-002', name: 'Patricia Johnson' }],
    trigger: { source: 'compliance', condition: 'ips_annual_review', value: 'IPS signed 2025-11-15', detectedAt: '2026-02-15T08:00:00Z' },
    suggestedAction: 'Review the IPS at the annual review',
    estimatedImpact: 0, createdAt: '2026-02-15T08:15:00Z', dismissed: false,
    actionRoute: { path: '/accounts/acc-002' },
    complianceInfo: {
      nonDismissible: true,
      escalationLevel: 'advisor',
      deadline: '2026-02-25T23:59:00Z',
      auditTrail: [
        { action: 'created', timestamp: '2026-02-15T08:15:00Z', actor: 'system', note: 'Annual IPS review on the agenda for the annual review' },
        { action: 'viewed', timestamp: '2026-02-20T09:30:00Z', actor: 'advisor-sarah-kim' },
      ],
    },
  },
```

In `src/mocks/data/client-comms.ts`:

`comm-001` — replace its `summary` and `timestamp`:

```ts
    summary: 'Sent the Q4 2025 performance report (doc-002) with a cover note.',
    timestamp: '2026-02-24T17:30:00Z',
```

`comm-009` — replace its `subject`, `summary` and `timestamp` (the array order does not matter; the CRM handler sorts by time):

```ts
    subject: 'Tax-loss harvest completed',
    summary: "Confirmed the harvest in Robert's individual account: sold 5,000 INTC on February 20, realizing a $32,750 long-term loss, and bought SMH to keep semiconductor exposure. INTC is not to be bought back in any of Robert's or Patricia's accounts, including IRAs, through March 22.",
    timestamp: '2026-02-20T16:00:00Z',
```

`comm-014` — replace its `summary`:

```ts
    summary: "Reviewed beneficiary designations across all accounts. The beneficiary on Robert's held-away Vanguard 401(k) does not match the estate plan. Robert will contact the plan administrator to update it.",
```

- [ ] **Step 7: Run the guards to verify they pass**

Run: `pnpm vitest run src/mocks/data/__tests__/meeting-data-truth.test.ts src/mocks/data/__tests__/nba-facts.test.ts src/mocks/handlers/__tests__/dashboard-consistency.test.ts --testTimeout 30000`
Expected: PASS. (`meetingsToday` now counts five events; the dashboard test derives its expectation from the calendar.)

- [ ] **Step 8: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green. If a test elsewhere asserted the old `comm-009` subject or `evt-010` date, it is asserting the falsehood this task removes: update it to the new fixture and name it in the task report.

- [ ] **Step 9: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/types/calendar.ts src/mocks/data/calendar.ts src/mocks/handlers/calendar.ts src/services/calendar.ts src/hooks/use-schedule.ts \
  src/mocks/data/planning.ts src/mocks/data/nbas.ts src/mocks/data/client-comms.ts \
  src/mocks/data/__tests__/meeting-data-truth.test.ts src/mocks/data/__tests__/nba-facts.test.ts
git commit -m "fix(data): the Johnson review is this afternoon; one IPS story; no communication after now; generated prep text removed"
```

---
### Task 2: Meeting types, agent profiles, permissions, the store's meetings, the seed, and the new message views

The contracts every later task uses: the meeting, agenda, note, task and view types; two agent ids and their profiles; the `prepare_meeting` act and the `file_meeting_record` binding act; the `meeting` subject and `RecordBasis`; five message kinds and their views in the thread and the live thread; the meeting thread, the Brief's meeting line and the seeded meeting in the store; Eastern-time formatting in the kit.

**Files:**
- Create: `src/types/workspace-meeting.ts`, `src/workspace/thread/MeetingNoticeView.tsx`, `src/workspace/thread/AgendaVersionLine.tsx`, `src/workspace/thread/MeetingHeldLine.tsx`, `src/workspace/thread/NotesDraftedLine.tsx`, `src/workspace/thread/MeetingTasksView.tsx`, `src/workspace/meeting/TaskTable.tsx`
- Modify: `src/types/workspace.ts`, `src/mocks/data/people.ts`, `src/mocks/data/workspace-store.ts`, `src/mocks/data/workspace-seed.ts`, `src/kit/measure.ts`, `src/workspace/thread/MessageView.tsx`, `src/workspace/workbench/CompactMessage.tsx`, `src/workspace/thread/act-kind-label.ts`, `src/workspace/full-views/full-view-href.ts`
- Test: `src/mocks/data/__tests__/people.test.ts`, `src/mocks/data/__tests__/workspace-seed.test.ts`, `src/mocks/workspace/__tests__/visibility.test.ts`, `src/kit/__tests__/measure.test.ts`, `src/workspace/__tests__/shell.test.tsx`, `src/workspace/__tests__/shell-keyboard.test.tsx`, `src/workspace/__tests__/meeting-messages.test.tsx` (new)

**Interfaces:**
- Consumes: `VersionAuthor`, `AgentId` from `@/types/workspace`; `eventTime` from `@/lib/clock`; `authorName` from `@/workspace/proposal/author-name`; `DataTable` from `@/kit/data-table/DataTable`.
- Produces (later tasks rely on these names exactly):

```ts
// src/types/workspace.ts (changed and added)
export type AgentId = 'drift-monitor' | 'pretrade-check' | 'harvest-scanner' | 'proposal' | 'client-letter' | 'meeting-prep' | 'meeting-notes'
export type AgentOutput = 'findings' | 'proposals' | 'letters' | 'agenda' | 'notes'
export type Subject = { type: 'account' | 'household' | 'client' | 'draft' | 'proposal' | 'alert' | 'message' | 'meeting'; id: string }
export type BindingActKind = 'approve_proposal' | 'withdraw_approval' | 'send_to_client' | 'file_meeting_record' | ComplianceActKind
export type RecordBasis = { eventId: string; actId: string; fingerprint: string }
// BindingAct and Draft gain: recordBasis?: RecordBasis
export type Act = BindingActKind | 'post_firm' | 'draft_for_client' | 'read_all_firm_threads' | 'prepare_meeting'
// Message gains:
  | { kind: 'meeting_notice'; id: string; threadId: string; at: string; eventId: string; meetingThreadId: string; title: string; start: string; end: string }
  | { kind: 'agenda_version'; id: string; threadId: string; at: string; eventId: string; version: number; author: VersionAuthor; changeSummary: string }
  | { kind: 'meeting_held'; id: string; threadId: string; at: string; eventId: string; start: string; end: string }
  | { kind: 'notes_drafted'; id: string; threadId: string; at: string; eventId: string; agentId: AgentId }
  | { kind: 'meeting_tasks'; id: string; threadId: string; at: string; eventId: string; filedActId: string; tasks: MeetingTask[] }

// src/types/workspace-meeting.ts — the full file is in Step 3.
// TranscriptSpeaker, TranscriptLine, AgendaSource, AgendaItem, AgendaItemInput, AgendaVersion, NOTE_SECTIONS, NoteSection, isNoteSection,
// TaskOwner, NoteLine, NoteLineInput, MeetingTask, MeetingState, MeetingFiling, Meeting, Attendee, MeetingEvent, MeetingSummary, MeetingView

// src/mocks/data/workspace-store.ts
// WorkspaceState gains: meetings: Meeting[]; Counter gains 'agenda' | 'task' | 'note'
export function sessionNow(): string            // eventTime(store().sequence): the session clock's present
export function nextNumber(counter: Counter): number   // now also for 'agenda' | 'task' | 'note'

// src/mocks/data/workspace-seed.ts
export const MEETING_THREAD_ID = 'th-johnson-meeting'
export const SEED_MEETINGS: readonly Meeting[]
export const SEED_LAST_SEQUENCE = 6

// src/kit/measure.ts
export function fmtEasternTime(iso: string): string            // '2026-02-25T19:00:00.000Z' → '14:00'
export function fmtEasternRange(start: string, end: string): string   // → '14:00–15:15 ET'

// src/workspace/full-views/full-view-href.ts
export const meetingFullViewHref: (eventId: string, fromThreadId?: string) => string     // /meetings/evt-010?from=th-johnson-meeting
export const householdFullViewHref: (householdId: string, fromThreadId?: string) => string // /households/hh-001?from=…
export const clientFullViewHref: (clientId: string, fromThreadId?: string) => string       // /clients/cli-001?from=…

// src/workspace/meeting/TaskTable.tsx
export function TaskTable(props: { caption: string; tasks: MeetingTask[]; directory: Directory }): JSX.Element
```

- [ ] **Step 1: Write the failing tests**

In `src/mocks/data/__tests__/people.test.ts`, add these rows to the `it.each` table:

```ts
    ['user-001', 'prepare_meeting', true], ['user-001', 'file_meeting_record', true],
    ['user-002', 'prepare_meeting', false], ['user-002', 'file_meeting_record', false],
    ['user-003', 'file_meeting_record', false], ['cco-001', 'file_meeting_record', false], ['cli-001', 'prepare_meeting', false],
```

and replace the `'the desk has five agents, each producing one kind of output'` test with:

```ts
  it('the desk has seven agents, each producing one kind of output', () => {
    expect(AGENTS.map((a) => [a.id, a.produces])).toEqual([
      ['drift-monitor', 'findings'], ['pretrade-check', 'findings'], ['harvest-scanner', 'findings'],
      ['proposal', 'proposals'], ['client-letter', 'letters'], ['meeting-prep', 'agenda'], ['meeting-notes', 'notes'],
    ])
  })
```

and append:

```ts
describe('phase 5 · meeting agents', () => {
  it('Meeting Prep measures and proposes; it files nothing and contacts no one', () => {
    expect(AGENTS.find((a) => a.id === 'meeting-prep')).toMatchObject({
      name: 'Meeting Prep', scope: { may: ['measure the household', 'propose an agenda'], mayNot: ['file notes', 'contact the client', 'post in a client thread'] },
    })
  })
  it('Meeting Notes drafts with citations; it never files, assigns or recommends', () => {
    expect(AGENTS.find((a) => a.id === 'meeting-notes')).toMatchObject({
      name: 'Meeting Notes',
      scope: { may: ['draft notes from the transcript, each line citing it'], mayNot: ['file', 'assign people', 'add a recommendation nobody made', 'post in a client thread'] },
    })
  })
  it('the Client Letter Agent may also draft a recap from a filed record, and still never sends', () => {
    expect(AGENTS.find((a) => a.id === 'client-letter')?.scope).toEqual({
      may: ['draft a client message from an approved version', 'draft a meeting recap from a filed record'], mayNot: ['send', 'post in a client thread'],
    })
  })
  it('only the advisor prepares a meeting and files its record', () => {
    for (const person of PEOPLE) {
      expect(can(person.id, 'prepare_meeting'), person.id).toBe(person.role === 'advisor')
      expect(can(person.id, 'file_meeting_record'), person.id).toBe(person.role === 'advisor')
    }
  })
})
```

In `src/mocks/data/__tests__/workspace-seed.test.ts`, replace the first test (`'has one thread per visibility with the right owners and members'`) with the two below, and add the third and fourth inside the same `describe`:

```ts
  it('has the brief, two team threads and the client thread, with the right owners and members', () => {
    resetWorkspaceStore()
    const { threads } = store()
    expect(threads.map((t) => [t.id, t.visibility])).toEqual([
      ['th-brief', 'private'], ['th-johnson-review', 'internal'], ['th-johnson-meeting', 'internal'], ['th-robert', 'client'],
    ])
    const [brief, review, , client] = threads
    expect(brief).toMatchObject({ ownerId: 'user-001', memberIds: ['user-001'] })
    expect(review).toMatchObject({ title: 'Johnson Rebalance Review', subject: { type: 'account', id: 'acc-002' } })
    expect(review!.agentIds).toEqual(['drift-monitor', 'pretrade-check', 'proposal'])
    expect(client).toMatchObject({ clientId: 'cli-001', agentIds: [] })
    expect(client!.memberIds).toEqual(expect.arrayContaining(['cli-001', 'user-001', 'user-002']))
  })
  it('the meeting thread is internal, about the Johnson household, with the two meeting agents', () => {
    resetWorkspaceStore()
    expect(store().threads.find((t) => t.id === MEETING_THREAD_ID)).toEqual({
      id: 'th-johnson-meeting', title: 'Johnson annual review', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
      agentIds: ['meeting-prep', 'meeting-notes'], subject: { type: 'household', id: 'hh-001' },
    })
  })
  it('the Brief carries the meeting line, timed from the calendar, linking to the meeting thread', () => {
    resetWorkspaceStore()
    const notice = store().messages.find((m) => m.kind === 'meeting_notice')
    const event = calendarEvents.find((e) => e.id === 'evt-010')!
    expect(notice).toEqual({
      kind: 'meeting_notice', id: 'msg-s05', threadId: 'th-brief', at: eventTime(5), eventId: 'evt-010', meetingThreadId: 'th-johnson-meeting',
      title: 'Johnson annual review', start: new Date(event.startTime).toISOString(), end: new Date(event.endTime).toISOString(),
    })
  })
  it('seeds the Johnson annual review as scheduled, with no agenda, notes or tasks', () => {
    resetWorkspaceStore()
    expect(store().meetings).toEqual([{ eventId: 'evt-010', householdId: 'hh-001', threadId: 'th-johnson-meeting', state: 'scheduled', agenda: [], tasks: [] }])
    expect(SEED_MEETINGS).toEqual(store().meetings)
    expect(store().meetings[0]).not.toBe(SEED_MEETINGS[0])
  })
  it('the session clock reads the latest event-clock sequence', () => {
    resetWorkspaceStore()
    expect(sessionNow()).toBe(eventTime(SEED_LAST_SEQUENCE))
    nextAt()
    expect(sessionNow()).toBe(eventTime(SEED_LAST_SEQUENCE + 1))
  })
```

and change the file's imports to:

```ts
import { describe, it, expect } from 'vitest'
import { store, resetWorkspaceStore, commitActId, nextAt, sessionNow } from '../workspace-store'
import { MEETING_THREAD_ID, SEED_LAST_SEQUENCE, SEED_MEETINGS, SEED_MESSAGES } from '../workspace-seed'
import { MOCK_NOW_ISO, eventTime } from '@/lib/clock'
import { accounts } from '../accounts'
import { calendarEvents } from '../calendar'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
```

In `src/mocks/workspace/__tests__/visibility.test.ts`, the three firm expectations become:

```ts
    expect(ids('user-001')).toEqual(['th-brief', 'th-johnson-meeting', 'th-johnson-review', 'th-robert'])
    expect(ids('user-002')).toEqual(['th-johnson-meeting', 'th-johnson-review', 'th-robert'])
    expect(ids('cco-001')).toEqual(['th-johnson-meeting', 'th-johnson-review', 'th-robert'])
```

(`ids` sorts, so the meeting thread sorts before the review.) In `src/workspace/__tests__/shell.test.tsx`, line 38 becomes `expect(threadLinks()).toEqual(['Supervision', 'Archive', 'Brief', 'Johnson Rebalance Review', 'Johnson annual review', 'Robert Johnson'])` and line 92 becomes `await waitFor(() => expect(threadLinks()).toEqual(['Supervision', 'Archive', 'Johnson Rebalance Review', 'Johnson annual review', 'Robert Johnson']))`; rename the test on line 35 to `'as Adrian lists four threads under the three headings, with one h1'`. In `src/workspace/__tests__/shell-keyboard.test.tsx`, the destination list gains `'Thread · Johnson annual review',` after `'Thread · Johnson Rebalance Review',` (Task 13 rewrites this list again).

In `src/kit/__tests__/measure.test.ts`, add `fmtEasternTime, fmtEasternRange` to the import and append inside `describe('measure', …)`:

```ts
  it('reads a time in Eastern Time, 24-hour, and a range with its zone', () => {
    expect(fmtEasternTime('2026-02-25T19:00:00.000Z')).toBe('14:00')
    expect(fmtEasternTime('2026-02-25T14:00:00-05:00')).toBe('14:00')
    expect(fmtEasternTime('2026-02-25T05:05:00Z')).toBe('00:05')
    expect(fmtEasternRange('2026-02-25T19:00:00.000Z', '2026-02-25T20:15:00.000Z')).toBe('14:00–15:15 ET')
    expect(() => fmtEasternTime('2026-02-25T14:00:00')).toThrow(MeasureError)
  })
```

Create `src/workspace/__tests__/meeting-messages.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { getDirectory } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { CompactMessage } from '@/workspace/workbench/CompactMessage'
import type { Message } from '@/types/workspace'

const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const MEETING: Message[] = [
  { kind: 'agenda_version', id: 'msg-t1', threadId: 'th-johnson-meeting', at: '2026-02-25T12:10:00.000Z', eventId: 'evt-010', version: 1,
    author: { kind: 'agent', agentId: 'meeting-prep' }, changeSummary: 'Proposed an agenda ordered by what needs attention first.' },
  { kind: 'meeting_held', id: 'msg-t2', threadId: 'th-johnson-meeting', at: '2026-02-25T20:15:00.000Z', eventId: 'evt-010',
    start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z' },
  { kind: 'notes_drafted', id: 'msg-t3', threadId: 'th-johnson-meeting', at: '2026-02-25T20:16:00.000Z', eventId: 'evt-010', agentId: 'meeting-notes' },
  { kind: 'meeting_tasks', id: 'msg-t4', threadId: 'th-johnson-meeting', at: '2026-02-25T20:18:00.000Z', eventId: 'evt-010', filedActId: 'REC-0001',
    tasks: [{ id: 'task-0001', title: 'Send the beneficiary checklist.', owner: { kind: 'person', personId: 'user-002' }, due: '2026-02-26', state: 'open', fromNoteLine: 'n-19' }] },
]

describe('meeting messages', () => {
  it("the Brief's meeting line says when, and opens the meeting thread", async () => {
    renderRoutes(routes, '/t/th-brief')
    const notice = await conversation().findByRole('article', { name: 'Meeting · Johnson annual review' })
    expect(notice).toHaveTextContent('Meeting at 14:00 ET')
    expect(notice).toHaveTextContent('Johnson annual review · 14:00–15:15 ET')
    expect(within(notice).getByRole('link', { name: /Open the meeting thread/ })).toHaveAttribute('href', '/t/th-johnson-meeting')
  })

  it('the meeting thread shows agenda versions, the held line, the notes line and the tasks', async () => {
    store().messages.push(...MEETING)
    renderRoutes(routes, '/t/th-johnson-meeting')
    await screen.findByRole('heading', { level: 1, name: 'Johnson annual review' })
    const agenda = await conversation().findByRole('article', { name: 'Agenda v1 · Meeting Prep' })
    expect(agenda).toHaveTextContent('Proposed an agenda ordered by what needs attention first.')
    expect(within(agenda).getByRole('link', { name: /Open the meeting view/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(conversation().getByRole('article', { name: 'Meeting held' })).toHaveTextContent('Meeting held · 14:00–15:15 ET · transcript received')
    expect(conversation().getByRole('article', { name: 'Notes drafted · Meeting Notes' })).toHaveTextContent('Drafted the notes from the transcript; every line cites the lines it records.')
    const tasks = conversation().getByRole('article', { name: 'Tasks from the filed record' })
    const table = within(tasks).getByRole('table', { name: 'Tasks from the filed record' })
    expect(table).toHaveTextContent('Send the beneficiary checklist.')
    expect(table).toHaveTextContent('Sarah Mitchell')
    expect(table).toHaveTextContent('2026-02-26')
    expect(tasks).toHaveTextContent('From REC-0001. Tracked here; nobody works them in this demo.')
  })

  it('the live thread has one line for each new kind', async () => {
    const directory = await getDirectory('user-001')
    const notice = store().messages.find((m) => m.kind === 'meeting_notice')!
    const lines = [notice, ...MEETING].map((m) => {
      const { container, unmount } = render(<CompactMessage message={m} directory={directory} />)
      const text = container.textContent ?? ''
      unmount()
      return text
    })
    expect(lines[0]).toContain('Meeting at 14:00 ET · Johnson annual review')
    expect(lines[1]).toContain('Agenda v1 · Proposed an agenda ordered by what needs attention first.')
    expect(lines[2]).toContain('Meeting held · 14:00–15:15 ET · transcript received')
    expect(lines[3]).toContain('Drafted the notes from the transcript.')
    expect(lines[4]).toContain('1 follow-up task from REC-0001.')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/data/__tests__/people.test.ts src/mocks/data/__tests__/workspace-seed.test.ts src/mocks/workspace/__tests__/visibility.test.ts src/kit/__tests__/measure.test.ts src/workspace/__tests__/meeting-messages.test.tsx --testTimeout 30000`
Expected: FAIL — no meeting agents, no `prepare_meeting`, no meeting thread, no `fmtEasternTime`, no `meeting_notice` view.

- [ ] **Step 3: The meeting types**

Create `src/types/workspace-meeting.ts`:

```ts
import type { VersionAuthor } from './workspace'

/** Who speaks in a transcript: the household's clients and the advisor. */
export type TranscriptSpeaker = 'cli-001' | 'cli-002' | 'user-001'
export type TranscriptLine = { id: string; speaker: TranscriptSpeaker; text: string }

/** Where an agenda item came from: a finding (or a carried finding) in the meeting thread, or the advisor. */
export type AgendaSource = { kind: 'finding'; messageId: string } | { kind: 'advisor' }
export type AgendaItem = { id: string; title: string; source: AgendaSource }
/** An item as a write names it: an existing item keeps its id; a new one has none yet. */
export type AgendaItemInput = { id?: string; title: string; source: AgendaSource }
/** Append-only: each change to the agenda is a new version. */
export type AgendaVersion = { n: number; items: AgendaItem[]; author: VersionAuthor; at: string }

export const NOTE_SECTIONS = ['discussion', 'decisions', 'client_requests', 'follow_ups'] as const
export type NoteSection = (typeof NOTE_SECTIONS)[number]
export const isNoteSection = (value: unknown): value is NoteSection =>
  typeof value === 'string' && (NOTE_SECTIONS as readonly string[]).includes(value)

/** Who owns a follow-up: a person at the firm or an agent. */
export type TaskOwner = VersionAuthor
/**
 * One line of the notes. `cites` names the transcript lines it records (at least one). A follow-up
 * also carries its owner — as stated in the meeting, cited — and its due date, an NYSE trading day.
 */
export type NoteLine = { id: string; section: NoteSection; text: string; cites: string[]; owner?: TaskOwner; due?: string }
/** A line as an edit names it: an existing line keeps its id; a new one has none yet. */
export type NoteLineInput = { id?: string; section: NoteSection; text: string; cites: string[]; owner?: TaskOwner; due?: string }

/** A follow-up tracked from the filed record. Nobody but the presenter acts live, so tasks are tracked, not worked. */
export type MeetingTask = { id: string; title: string; owner: TaskOwner; due: string; state: 'open' | 'done'; fromNoteLine: string }

export type MeetingState = 'scheduled' | 'held' | 'filed'
/** The record as filed: the note lines exactly as they stood, and the fingerprint the act recorded. */
export type MeetingFiling = { actId: string; fingerprint: string; lines: NoteLine[] }

/** The session's meeting: its state machine, its agenda versions, the notes draft, the filing and the tasks. */
export type Meeting = {
  eventId: string
  householdId: string
  threadId: string
  state: MeetingState
  agenda: AgendaVersion[]
  heldAt?: { start: string; end: string }
  notesDraft?: NoteLine[]
  filed?: MeetingFiling
  tasks: MeetingTask[]
}

export type Attendee = { id: string; name: string }
/** The calendar event, in UTC, with its attendees named. */
export type MeetingEvent = { id: string; title: string; start: string; end: string; location?: string; attendees: Attendee[]; householdId: string; clientId: string }

export type MeetingSummary = {
  eventId: string
  /** The meeting thread's title, e.g. "Johnson annual review". */
  title: string
  threadId: string
  householdId: string
  clientId: string
  start: string
  end: string
  state: MeetingState
  filedActId?: string
}

/** The meeting as a firm viewer reads it. The transcript is served only once the meeting is held. */
export type MeetingView = MeetingSummary & {
  event: MeetingEvent
  agenda: AgendaVersion[]
  heldAt?: { start: string; end: string }
  notesDraft?: NoteLine[]
  /** The fingerprint `file_meeting_record` must name: the notes draft as it stands. */
  notesFingerprint?: string
  filed?: MeetingFiling
  tasks: MeetingTask[]
  transcript?: TranscriptLine[]
}
```

- [ ] **Step 4: The workspace types**

In `src/types/workspace.ts`:

- add `import type { MeetingTask } from './workspace-meeting'` beside the existing `Fill` import;
- `AgentId` becomes `'drift-monitor' | 'pretrade-check' | 'harvest-scanner' | 'proposal' | 'client-letter' | 'meeting-prep' | 'meeting-notes'`;
- `AgentOutput` becomes `'findings' | 'proposals' | 'letters' | 'agenda' | 'notes'` and its doc comment `/** What an agent produces: findings in a thread, proposal versions, client-letter drafts, a meeting agenda, or meeting notes. */`;
- `Subject['type']` gains `'meeting'` (its id is the calendar event id);
- add these members to `Message`, after `fills`:

```ts
  /** The Brief's line for a meeting today. */
  | { kind: 'meeting_notice'; id: string; threadId: string; at: string; eventId: string; meetingThreadId: string; title: string; start: string; end: string }
  /** A new agenda version in the meeting thread. */
  | { kind: 'agenda_version'; id: string; threadId: string; at: string; eventId: string; version: number; author: VersionAuthor; changeSummary: string }
  /** The meeting happened: its window, in UTC, and the transcript arrived. */
  | { kind: 'meeting_held'; id: string; threadId: string; at: string; eventId: string; start: string; end: string }
  /** The Meeting Notes agent drafted the notes. */
  | { kind: 'notes_drafted'; id: string; threadId: string; at: string; eventId: string; agentId: AgentId }
  /** The follow-up tasks the filing created, as they were created. */
  | { kind: 'meeting_tasks'; id: string; threadId: string; at: string; eventId: string; filedActId: string; tasks: MeetingTask[] }
```

- `BindingActKind` becomes `'approve_proposal' | 'withdraw_approval' | 'send_to_client' | 'file_meeting_record' | ComplianceActKind`;
- after `LetterBasis`, add:

```ts
/** A recap's basis: the filing it was written from. It is stale once the meeting's filing no longer matches. */
export type RecordBasis = { eventId: string; actId: string; fingerprint: string }
```

- `BindingAct` gains, after `basis?`: `/** The filed meeting record a sent recap came from. */ recordBasis?: RecordBasis`;
- `Draft` gains `recordBasis?: RecordBasis` after `basis?`;
- `Act` becomes `BindingActKind | 'post_firm' | 'draft_for_client' | 'read_all_firm_threads' | 'prepare_meeting'`.

- [ ] **Step 5: Agent profiles and permissions**

In `src/mocks/data/people.ts`, replace the `client-letter` entry of `AGENTS` and append the two meeting agents:

```ts
  { id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft a client message from an approved version', 'draft a meeting recap from a filed record'], mayNot: ['send', 'post in a client thread'] } },
  { id: 'meeting-prep', name: 'Meeting Prep', produces: 'agenda', scope: { may: ['measure the household', 'propose an agenda'], mayNot: ['file notes', 'contact the client', 'post in a client thread'] } },
  { id: 'meeting-notes', name: 'Meeting Notes', produces: 'notes', scope: { may: ['draft notes from the transcript, each line citing it'], mayNot: ['file', 'assign people', 'add a recommendation nobody made', 'post in a client thread'] } },
```

and the advisor's permissions become:

```ts
  advisor: ['post_firm', 'draft_for_client', 'send_to_client', 'approve_proposal', 'withdraw_approval', 'prepare_meeting', 'file_meeting_record'],
```

- [ ] **Step 6: The store's meetings and the seed**

In `src/mocks/data/workspace-seed.ts`, add `import type { Meeting } from '@/types/workspace-meeting'`, then:

- insert the meeting thread into `SEED_THREADS` between `th-johnson-review` and `th-robert`:

```ts
  { id: 'th-johnson-meeting', title: 'Johnson annual review', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
    agentIds: ['meeting-prep', 'meeting-notes'], subject: { type: 'household', id: 'hh-001' } },
```

- append two seed messages to `SEED_MESSAGES`:

```ts
  // The Brief's line for this afternoon's annual review (evt-010, 14:00–15:15 ET).
  { kind: 'meeting_notice', id: 'msg-s05', threadId: 'th-brief', at: eventTime(5), eventId: 'evt-010', meetingThreadId: 'th-johnson-meeting',
    title: 'Johnson annual review', start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z' },
  { kind: 'text', id: 'msg-s06', threadId: 'th-johnson-meeting', authorId: 'user-002', at: eventTime(6),
    body: "Robert and Patricia confirmed this afternoon's annual review." },
```

- change `SEED_LAST_SEQUENCE` to `6`, and append:

```ts
export const MEETING_THREAD_ID = 'th-johnson-meeting'

/** The Johnson annual review, scheduled: no agenda, notes or tasks until the session makes them. */
export const SEED_MEETINGS: readonly Meeting[] = [
  { eventId: 'evt-010', householdId: 'hh-001', threadId: MEETING_THREAD_ID, state: 'scheduled', agenda: [], tasks: [] },
]
```

In `src/mocks/data/workspace-store.ts`:

```ts
import type { Meeting } from '@/types/workspace-meeting'
import { SEED_LAST_SEQUENCE, SEED_MEETINGS, SEED_MESSAGES, SEED_THREADS } from './workspace-seed'

type Counter = 'msg' | 'draft' | 'act' | 'proposal' | 'staged' | 'record' | 'agenda' | 'task' | 'note'
```

`WorkspaceState` gains, after `supervisionRecords`:

```ts
  /** The session's meetings: each one's state machine, agenda versions, notes, filing and tasks. */
  meetings: Meeting[]
```

`seed()` gains `meetings: SEED_MEETINGS.map((m) => ({ ...m, agenda: [], tasks: [] })),` and its counters become `{ msg: 0, draft: 0, act: 0, proposal: 0, staged: 0, record: 0, agenda: 0, task: 0, note: 0 }`. Append:

```ts
/** The session clock's present: the time of the latest recorded event (the frozen now plus the sequence). */
export function sessionNow(): string {
  return eventTime(store().sequence)
}
```

- [ ] **Step 7: Eastern time in the kit**

In `src/kit/measure.ts`, after `fmtTimestamp`:

```ts
const easternClock = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York' })

/** A time as the calendar states it, in New York: "14:00". The instant must state its offset. */
export function fmtEasternTime(iso: string): string {
  return easternClock.format(parseIso(iso))
}

/** A meeting's window in New York time, with the zone: "14:00–15:15 ET". */
export function fmtEasternRange(start: string, end: string): string {
  return `${fmtEasternTime(start)}–${fmtEasternTime(end)} ET`
}
```

- [ ] **Step 8: Full-view links**

Replace `src/workspace/full-views/full-view-href.ts` with:

```ts
/** A full view's path, remembering the thread it was opened from so the view can link back. */
const withFrom = (path: string, fromThreadId?: string) => `${path}${fromThreadId ? `?from=${encodeURIComponent(fromThreadId)}` : ''}`

export const accountFullViewHref = (accountId: string, fromThreadId?: string) => withFrom(`/accounts/${encodeURIComponent(accountId)}`, fromThreadId)
export const meetingFullViewHref = (eventId: string, fromThreadId?: string) => withFrom(`/meetings/${encodeURIComponent(eventId)}`, fromThreadId)
export const householdFullViewHref = (householdId: string, fromThreadId?: string) => withFrom(`/households/${encodeURIComponent(householdId)}`, fromThreadId)
export const clientFullViewHref = (clientId: string, fromThreadId?: string) => withFrom(`/clients/${encodeURIComponent(clientId)}`, fromThreadId)
```

- [ ] **Step 9: The task table and the five views**

Create `src/workspace/meeting/TaskTable.tsx`:

```tsx
import { DataTable } from '@/kit/data-table/DataTable'
import { fmtDate } from '@/kit/measure'
import { authorName } from '@/workspace/proposal/author-name'
import type { Directory } from '@/types/workspace'
import type { MeetingTask } from '@/types/workspace-meeting'

const STATE_WORDS: Readonly<Record<MeetingTask['state'], string>> = { open: 'Open', done: 'Done' }

/** Follow-up tasks: what, who, by when (an NYSE trading day), and where each stands. */
export function TaskTable({ caption, tasks, directory }: { caption: string; tasks: MeetingTask[]; directory: Directory }) {
  return (
    <DataTable caption={caption} rows={tasks} getRowId={(t) => t.id} total={tasks.length} noun={{ singular: 'task', plural: 'tasks' }}
      columns={[
        { id: 'task', header: 'Task', wrap: true, cell: (t) => t.title },
        { id: 'owner', header: 'Owner', cell: (t) => authorName(t.owner, directory), sortValue: (t) => authorName(t.owner, directory) },
        { id: 'due', header: 'Due', cell: (t) => fmtDate(t.due), sortValue: (t) => t.due },
        { id: 'state', header: 'State', cell: (t) => STATE_WORDS[t.state] },
      ]} />
  )
}
```

Create `src/workspace/thread/MeetingNoticeView.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { fmtEasternRange, fmtEasternTime } from '@/kit/measure'
import type { Message } from '@/types/workspace'

type Notice = Extract<Message, { kind: 'meeting_notice' }>

/** The Brief's line for a meeting today: when, which meeting, and the way to its thread. */
export function MeetingNoticeView({ notice }: { notice: Notice }) {
  return (
    <article aria-label={`Meeting · ${notice.title}`} className="flex min-w-0 flex-col gap-2 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">{`Meeting at ${fmtEasternTime(notice.start)} ET`}</p>
      <p className="text-copy">{`${notice.title} · ${fmtEasternRange(notice.start, notice.end)}`}</p>
      <Link to={`/t/${encodeURIComponent(notice.meetingThreadId)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the meeting thread <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
```

Create `src/workspace/thread/AgendaVersionLine.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { fmtTimestamp } from '@/kit/measure'
import { authorName } from '@/workspace/proposal/author-name'
import { meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import type { Directory, Message } from '@/types/workspace'

type AgendaMessage = Extract<Message, { kind: 'agenda_version' }>

export function AgendaVersionLine({ message, directory }: { message: AgendaMessage; directory: Directory }) {
  const name = authorName(message.author, directory)
  return (
    <article aria-label={`Agenda v${message.version} · ${name}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="tabular text-body font-semibold">{`Agenda v${message.version}`}</span>
        <span className="text-body">{name}</span>
        <span className="text-label uppercase text-ink-3">{message.author.kind === 'agent' ? 'Agent' : 'Agenda'}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">{message.changeSummary}</p>
      <Link to={meetingFullViewHref(message.eventId, message.threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the meeting view <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
```

Create `src/workspace/thread/MeetingHeldLine.tsx`:

```tsx
import { fmtEasternRange, fmtTimestamp } from '@/kit/measure'
import type { Message } from '@/types/workspace'

type Held = Extract<Message, { kind: 'meeting_held' }>

export function MeetingHeldLine({ message }: { message: Held }) {
  return (
    <article aria-label="Meeting held" className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label uppercase text-ink-2">Record</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">{`Meeting held · ${fmtEasternRange(message.start, message.end)} · transcript received`}</p>
    </article>
  )
}
```

Create `src/workspace/thread/NotesDraftedLine.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { fmtTimestamp } from '@/kit/measure'
import { meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import type { Directory, Message } from '@/types/workspace'

type Drafted = Extract<Message, { kind: 'notes_drafted' }>

export function NotesDraftedLine({ message, directory }: { message: Drafted; directory: Directory }) {
  const agent = directory.agents.find((a) => a.id === message.agentId)
  if (!agent) throw new Error(`No agent "${message.agentId}" in the directory`)
  return (
    <article aria-label={`Notes drafted · ${agent.name}`} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-semibold">{agent.name}</span>
        <span className="text-label uppercase text-ink-3">Agent</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-copy">Drafted the notes from the transcript; every line cites the lines it records.</p>
      <Link to={meetingFullViewHref(message.eventId, message.threadId)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the notes beside the transcript <span aria-hidden="true">↗</span>
      </Link>
    </article>
  )
}
```

Create `src/workspace/thread/MeetingTasksView.tsx`:

```tsx
import { fmtTimestamp } from '@/kit/measure'
import { TaskTable } from '@/workspace/meeting/TaskTable'
import type { Directory, Message } from '@/types/workspace'

type Tasks = Extract<Message, { kind: 'meeting_tasks' }>

const TITLE = 'Tasks from the filed record'

export function MeetingTasksView({ message, directory }: { message: Tasks; directory: Directory }) {
  return (
    <article aria-label={TITLE} className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label uppercase text-ink-2">{TITLE}</span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <p className="text-body text-ink-2">{`From ${message.filedActId}. Tracked here; nobody works them in this demo.`}</p>
      <TaskTable caption={TITLE} tasks={message.tasks} directory={directory} />
    </article>
  )
}
```

In `src/workspace/thread/MessageView.tsx`, import the five views and add, before `default:`:

```tsx
    case 'meeting_notice':
      return <MeetingNoticeView notice={message} />
    case 'agenda_version':
      return <AgendaVersionLine message={message} directory={directory} />
    case 'meeting_held':
      return <MeetingHeldLine message={message} />
    case 'notes_drafted':
      return <NotesDraftedLine message={message} directory={directory} />
    case 'meeting_tasks':
      return <MeetingTasksView message={message} directory={directory} />
```

In `src/workspace/workbench/CompactMessage.tsx`, change the measure import to `import { fmtEasternRange, fmtEasternTime, fmtTimestamp } from '@/kit/measure'` and add after the `fills` case:

```tsx
    case 'meeting_notice': return <Line who="Brief" at={message.at}>{`Meeting at ${fmtEasternTime(message.start)} ET · ${message.title}`}</Line>
    case 'agenda_version': return <Line who={authorName(message.author, directory)} at={message.at}>{`Agenda v${message.version} · ${message.changeSummary}`}</Line>
    case 'meeting_held': return <Line who="Record" at={message.at}>{`Meeting held · ${fmtEasternRange(message.start, message.end)} · transcript received`}</Line>
    case 'notes_drafted': return <Line who={agentName(directory, message.agentId)} at={message.at}>Drafted the notes from the transcript.</Line>
    case 'meeting_tasks': return <Line who="Record" at={message.at}>{`${message.tasks.length} follow-up ${message.tasks.length === 1 ? 'task' : 'tasks'} from ${message.filedActId}.`}</Line>
```

In `src/workspace/thread/act-kind-label.ts`, add `file_meeting_record: 'File meeting record',` to `ACT_KIND_LABEL` after `send_to_client`.

- [ ] **Step 10: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/data/__tests__/people.test.ts src/mocks/data/__tests__/workspace-seed.test.ts src/mocks/workspace/__tests__/visibility.test.ts src/kit/__tests__/measure.test.ts src/workspace/__tests__/meeting-messages.test.tsx src/workspace/__tests__/shell.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 11: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green. `ARCHIVE_KINDS` is a literal list, so the compiler does not force `file_meeting_record` into it; Task 6 adds it with its test. A test that counted thread links, agents or seed messages for the three-thread seed is updated to the four-thread seed in this step; name each in the task report.

- [ ] **Step 12: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/types/workspace.ts src/types/workspace-meeting.ts src/mocks/data/people.ts src/mocks/data/workspace-store.ts src/mocks/data/workspace-seed.ts \
  src/kit/measure.ts src/workspace/full-views/full-view-href.ts src/workspace/meeting/TaskTable.tsx \
  src/workspace/thread/MeetingNoticeView.tsx src/workspace/thread/AgendaVersionLine.tsx src/workspace/thread/MeetingHeldLine.tsx \
  src/workspace/thread/NotesDraftedLine.tsx src/workspace/thread/MeetingTasksView.tsx src/workspace/thread/MessageView.tsx \
  src/workspace/workbench/CompactMessage.tsx src/workspace/thread/act-kind-label.ts \
  src/mocks/data/__tests__/people.test.ts src/mocks/data/__tests__/workspace-seed.test.ts src/mocks/workspace/__tests__/visibility.test.ts \
  src/kit/__tests__/measure.test.ts src/workspace/__tests__/shell.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx src/workspace/__tests__/meeting-messages.test.tsx
git commit -m "feat(meetings): meeting types, agents, permissions, the meeting thread and its message views"
```

---
### Task 3: The transcript, the meeting read model, holding the meeting, and agenda versions

The meeting's state machine starts here: who may read a meeting, the view a firm viewer gets (the transcript only once held), **Hold the meeting** moving the event clock to the meeting's end, and the append-only agenda with a version line in the thread for every change.

**Files:**
- Create: `src/mocks/data/meeting-transcripts.ts`, `src/mocks/workspace/meetings.ts`
- Test: `src/mocks/data/__tests__/meeting-transcript.test.ts` (new), `src/mocks/workspace/__tests__/meetings.test.ts` (new)

**Interfaces:**
- Consumes: `store`, `nextAt`, `nextId`, `nextNumber`, `advanceClockTo`, `sessionNow` from `@/mocks/data/workspace-store`; `calendarEvents`; `clients`; `can`, `personById` from `@/mocks/data/people`; `canSeeThread` from `./visibility`; `fingerprint` from `@/lib/fingerprint`; the Task 2 types.
- Produces:

```ts
// src/mocks/data/meeting-transcripts.ts
export const JOHNSON_REVIEW_TRANSCRIPT: readonly TranscriptLine[]       // t-01 … t-25
export function transcriptOf(eventId: string): readonly TranscriptLine[] | undefined

// src/mocks/workspace/meetings.ts
export type MeetingFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type MeetingResult = { ok: true; meeting: Meeting } | MeetingFailure
export const refuseMeeting: (status: MeetingFailure['status'], code: string, message: string) => MeetingFailure
export function meetingEvent(eventId: string): MeetingEvent | undefined
export function meetingOf(eventId: string): Meeting | undefined            // the store's meeting, unfiltered (engine use)
export function meetingTitle(meeting: Meeting): string                      // its thread's title
export function visibleMeeting(viewerId: string, eventId: string): Meeting | undefined
export function meetingSummaries(viewerId: string): MeetingSummary[] | undefined   // undefined for a client
export function meetingView(viewerId: string, eventId: string): MeetingView | undefined
export function notesFingerprint(lines: readonly NoteLine[]): string
export function preparing(viewerId: string, eventId: string): MeetingResult       // 404 NO_MEETING, 403 NOT_PERMITTED
export function replaceMeeting(meeting: Meeting): void
export function currentAgenda(meeting: Meeting): AgendaVersion | undefined
export function appendAgenda(meeting: Meeting, items: AgendaItem[], author: VersionAuthor, changeSummary: string): Meeting
export function agendaChangeSummary(before: readonly AgendaItem[], after: readonly AgendaItem[]): string | undefined
export function holdMeeting(viewerId: string, eventId: string): MeetingResult
export function reviseAgenda(viewerId: string, eventId: string, items: readonly AgendaItemInput[]): MeetingResult
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/data/__tests__/meeting-transcript.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { JOHNSON_REVIEW_TRANSCRIPT, transcriptOf } from '../meeting-transcripts'

const PLAN_NAMES = /401\(k\)|403\(b\)/g
const text = (id: string) => JOHNSON_REVIEW_TRANSCRIPT.find((l) => l.id === id)?.text ?? ''
const all = JOHNSON_REVIEW_TRANSCRIPT.map((l) => l.text).join(' ')

describe('the Johnson annual review transcript', () => {
  it('has twenty-five turns, t-01 to t-25, by Robert, Patricia and Adrian', () => {
    expect(JOHNSON_REVIEW_TRANSCRIPT.map((l) => l.id)).toEqual(Array.from({ length: 25 }, (_, i) => `t-${String(i + 1).padStart(2, '0')}`))
    expect(new Set(JOHNSON_REVIEW_TRANSCRIPT.map((l) => l.speaker))).toEqual(new Set(['cli-001', 'cli-002', 'user-001']))
    expect(transcriptOf('evt-010')).toBe(JOHNSON_REVIEW_TRANSCRIPT)
    expect(transcriptOf('evt-002')).toBeUndefined()
  })

  it('states no figure: figures come from the engine (the plan names 401(k) and 403(b) aside)', () => {
    for (const line of JOHNSON_REVIEW_TRANSCRIPT) expect(line.text.replace(PLAN_NAMES, ''), line.id).not.toMatch(/\d/)
  })

  it('covers the meeting content table, topic by topic', () => {
    // This morning's rebalance and harvest: not buying INTC back; dividends and held-away plans count.
    expect(text('t-02')).toContain('Intel')
    expect(text('t-04')).toMatch(/dividends/)
    expect(text('t-04')).toMatch(/Vanguard/)
    expect(text('t-05')).toContain('Intel')
    // The legacy goal: Patricia wants it kept; Mike's scenarios; options at the next review.
    expect(text('t-07')).toMatch(/legacy goal/)
    expect(text('t-08')).toMatch(/Mike.*scenarios.*Monday/)
    // Roth conversions before RMDs (seventy-three); an estimate, not tax advice; the CPA; Mike's analysis.
    expect(text('t-10')).toContain('seventy-three')
    expect(text('t-11')).toMatch(/conversion amounts/)
    expect(text('t-12')).toMatch(/Mike/)
    expect(text('t-12')).toMatch(/estimate/)
    expect(text('t-12')).toMatch(/CPA/)
    // Consolidating the held-away plans: asked; no recommendation; the comparison; Sarah's request.
    expect(text('t-13')).toMatch(/401\(k\).*403\(b\)/)
    expect(text('t-14')).toMatch(/fees.*services.*investment options/)
    expect(text('t-15')).toMatch(/Sarah.*fee disclosures.*statements/)
    // The beneficiary on the Vanguard 401(k): Robert calls the administrator; Sarah's checklist.
    expect(text('t-17')).toMatch(/beneficiary/)
    expect(text('t-18')).toMatch(/plan administrator/)
    expect(text('t-19')).toMatch(/Sarah.*beneficiary checklist/)
    // ESG for the trust: a signed amendment; Adrian drafts it for the next meeting.
    expect(text('t-20')).toContain('ESG')
    expect(text('t-21')).toMatch(/signed amendment/)
    expect(text('t-23')).toMatch(/draft the amendment.*next meeting/)
    // The IPS: reviewed; no other change.
    expect(text('t-24')).toMatch(/investment policy statement stays as signed/)
    expect(all).not.toMatch(/\brecommend (you|that you) (roll|move|consolidate)/i)
  })
})
```

Create `src/mocks/workspace/__tests__/meetings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { advanceClockTo, nextAt, store } from '@/mocks/data/workspace-store'
import { eventTime } from '@/lib/clock'
import { agendaChangeSummary, holdMeeting, meetingEvent, meetingSummaries, meetingView, notesFingerprint, reviseAgenda, visibleMeeting } from '../meetings'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const ESG = { title: 'ESG alternatives for the trust', source: { kind: 'advisor' as const } }
const IPS = { title: 'The investment policy statement', source: { kind: 'advisor' as const } }
const heldMessages = () => store().messages.filter((m) => m.kind === 'meeting_held')
const agendaMessages = () => store().messages.filter((m) => m.kind === 'agenda_version')

describe('the meeting read model', () => {
  it('names the calendar event in UTC with its attendees, Patricia from the CRM', () => {
    expect(meetingEvent('evt-010')).toEqual({
      id: 'evt-010', title: 'Annual Review — Johnson Household', start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z',
      location: 'Office — Main', householdId: 'hh-001', clientId: 'cli-001',
      attendees: [{ id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-002', name: 'Patricia Johnson' }, { id: 'user-001', name: 'Adrian Hale' }],
    })
    expect(meetingEvent('evt-004')).toBeUndefined()
  })

  it('every firm viewer reads the meeting; a client and a stranger are told it does not exist', () => {
    for (const viewer of ['user-001', 'user-002', 'user-003', 'cco-001']) expect(visibleMeeting(viewer, 'evt-010'), viewer).toBeDefined()
    expect(visibleMeeting('cli-001', 'evt-010')).toBeUndefined()
    expect(visibleMeeting('nobody', 'evt-010')).toBeUndefined()
    expect(visibleMeeting(ADRIAN, 'evt-999')).toBeUndefined()
    expect(meetingSummaries('cli-001')).toBeUndefined()
    expect(meetingSummaries('cco-001')).toEqual([{
      eventId: 'evt-010', title: 'Johnson annual review', threadId: 'th-johnson-meeting', householdId: 'hh-001', clientId: 'cli-001',
      start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z', state: 'scheduled',
    }])
  })

  it('serves no transcript while the meeting is scheduled', () => {
    const view = meetingView(ADRIAN, 'evt-010')
    expect(view?.state).toBe('scheduled')
    expect(view?.transcript).toBeUndefined()
    expect(view?.notesDraft).toBeUndefined()
  })
})

describe('holding the meeting', () => {
  it("moves the session clock to the meeting's end and posts the held line; the transcript arrives", () => {
    const { meeting } = ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(meeting).toMatchObject({ state: 'held', heldAt: { start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z' } })
    expect(store().sequence).toBe(495)
    expect(heldMessages()).toEqual([{
      kind: 'meeting_held', id: expect.any(String), threadId: 'th-johnson-meeting', at: '2026-02-25T20:15:00.000Z', eventId: 'evt-010',
      start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z',
    }])
    expect(meetingView(ADRIAN, 'evt-010')?.transcript).toHaveLength(25)
    expect(nextAt()).toBe(eventTime(496))
  })

  it('holds once: a second hold is refused and the clock does not move again', () => {
    ok(holdMeeting(ADRIAN, 'evt-010'))
    const sequence = store().sequence
    expect(holdMeeting(ADRIAN, 'evt-010')).toMatchObject({ ok: false, status: 409, code: 'ALREADY_HELD' })
    expect(store().sequence).toBe(sequence)
    expect(heldMessages()).toHaveLength(1)
  })

  it('never runs the clock backwards: held after the end, the line is at the later time', () => {
    advanceClockTo(600)
    const { meeting } = ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(heldMessages()[0]?.at).toBe(eventTime(601))
    expect(meeting.heldAt).toEqual({ start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z' })
  })

  it('only the advisor holds it; a client is told it does not exist', () => {
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(holdMeeting(viewer, 'evt-010'), viewer).toMatchObject({ ok: false, status: 403, code: 'NOT_PERMITTED' })
    expect(holdMeeting('cli-001', 'evt-010')).toMatchObject({ ok: false, status: 404, code: 'NO_MEETING' })
    expect(store().meetings[0]?.state).toBe('scheduled')
    expect(store().sequence).toBe(6)
  })
})

describe('agenda versions', () => {
  it("each change is a new version, posted as a line in the meeting thread, the earlier ones kept", () => {
    ok(reviseAgenda(ADRIAN, 'evt-010', [ESG]))
    const v1 = store().meetings[0]!.agenda[0]!
    expect(v1).toMatchObject({ n: 1, author: { kind: 'person', personId: ADRIAN }, items: [{ id: 'ag-0001', ...ESG }] })
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }, IPS]))
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0002', ...IPS }, { id: 'ag-0001', ...ESG }]))
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0002', ...IPS }]))
    const agenda = store().meetings[0]!.agenda
    expect(agenda.map((v) => v.n)).toEqual([1, 2, 3, 4])
    expect(agenda[0]).toEqual(v1)
    expect(agendaMessages().map((m) => m.kind === 'agenda_version' && [m.version, m.changeSummary])).toEqual([
      [1, 'Added “ESG alternatives for the trust”.'],
      [2, 'Added “The investment policy statement”.'],
      [3, 'Reordered the agenda.'],
      [4, 'Dropped “ESG alternatives for the trust”.'],
    ])
  })

  it('refuses an unchanged, empty, untitled or unknown agenda, and a finding that is not in the meeting thread', () => {
    ok(reviseAgenda(ADRIAN, 'evt-010', [ESG]))
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }])).toMatchObject({ status: 400, code: 'NO_CHANGE' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [])).toMatchObject({ status: 400, code: 'EMPTY_AGENDA' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ title: '   ', source: { kind: 'advisor' } }])).toMatchObject({ status: 400, code: 'TITLE_REQUIRED' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ title: 'x'.repeat(201), source: { kind: 'advisor' } }])).toMatchObject({ status: 400, code: 'TITLE_TOO_LONG' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0099', ...ESG }])).toMatchObject({ status: 400, code: 'UNKNOWN_ITEM' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }, { id: 'ag-0001', ...ESG }])).toMatchObject({ status: 400, code: 'DUPLICATE_ITEM' })
    expect(reviseAgenda(ADRIAN, 'evt-010', [{ title: 'A finding', source: { kind: 'finding', messageId: 'msg-b01' } }])).toMatchObject({ status: 400, code: 'UNKNOWN_FINDING' })
    expect(store().meetings[0]!.agenda).toHaveLength(1)
    // A refused write allocates no item ids.
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ id: 'ag-0001', ...ESG }, IPS]))
    expect(store().meetings[0]!.agenda[1]!.items[1]!.id).toBe('ag-0002')
  })

  it('closes when the meeting is held; only the advisor edits it', () => {
    expect(reviseAgenda('user-002', 'evt-010', [ESG])).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(reviseAgenda(ADRIAN, 'evt-010', [ESG])).toMatchObject({ status: 409, code: 'MEETING_HELD' })
  })

  it('a renamed item reads as renamed', () => {
    expect(agendaChangeSummary([{ id: 'ag-0001', ...ESG }], [{ id: 'ag-0001', title: 'ESG for the trust', source: { kind: 'advisor' } }]))
      .toBe('Renamed “ESG alternatives for the trust” to “ESG for the trust”.')
  })
})

describe('the notes fingerprint', () => {
  it('covers every part of every line, in order', () => {
    const line = { id: 'n-01', section: 'decisions' as const, text: 'Keep the legacy goal.', cites: ['t-07'] }
    const base = notesFingerprint([line])
    expect(notesFingerprint([line])).toBe(base)
    expect(notesFingerprint([{ ...line, text: 'Keep the legacy goal!' }])).not.toBe(base)
    expect(notesFingerprint([{ ...line, cites: ['t-08'] }])).not.toBe(base)
    expect(notesFingerprint([{ ...line, section: 'discussion' }])).not.toBe(base)
    expect(notesFingerprint([{ ...line, due: '2026-03-02' }])).not.toBe(base)
  })
})
```

(The test setup resets the workspace store before every test, so each starts from the seed.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/data/__tests__/meeting-transcript.test.ts src/mocks/workspace/__tests__/meetings.test.ts --testTimeout 30000`
Expected: FAIL — the modules do not exist.

- [ ] **Step 3: The transcript**

Create `src/mocks/data/meeting-transcripts.ts`:

```ts
import type { TranscriptLine } from '@/types/workspace-meeting'

/**
 * The Johnson annual review (evt-010), as the transcript service delivers it once the meeting is held.
 * Fixture data: it states no figure (the figures on screen come from the engine), and it follows the
 * story of Phases 3–4 — this morning's rebalance and the rest of the INTC harvest.
 */
export const JOHNSON_REVIEW_TRANSCRIPT: readonly TranscriptLine[] = [
  { id: 't-01', speaker: 'user-001', text: "Thank you both for coming in. I'd like to start with what changed this morning, then the plan, then a few open items." },
  { id: 't-02', speaker: 'user-001', text: "This morning we rebalanced Robert's individual account and sold the rest of the Intel shares at a loss. That loss only counts if no Intel is bought back until its window closes." },
  { id: 't-03', speaker: 'cli-001', text: "So I shouldn't buy Intel again for now, even in my IRA?" },
  { id: 't-04', speaker: 'user-001', text: "Right: not in any of your accounts or Patricia's, including the IRAs and your old Vanguard plan. And dividends set to reinvest into Intel count as buying it." },
  { id: 't-05', speaker: 'cli-001', text: "Understood. I'll leave Intel alone until you tell me the window has closed." },
  { id: 't-06', speaker: 'user-001', text: 'The plan shows the legacy goal at risk. The retirement goal is on track.' },
  { id: 't-07', speaker: 'cli-002', text: "The legacy goal matters most to me. I don't want to give up on it." },
  { id: 't-08', speaker: 'user-001', text: "Then we keep it. Mike will have scenarios ready by Monday, and we'll bring you the options at the next review." },
  { id: 't-09', speaker: 'cli-001', text: 'My required distributions start in a few years. Should we be converting some of the IRA to a Roth before then?' },
  { id: 't-10', speaker: 'user-001', text: 'It is worth modelling. Your distributions begin in the year you turn seventy-three, so the years before that are the window.' },
  { id: 't-11', speaker: 'cli-001', text: 'Please model a few conversion amounts for us.' },
  { id: 't-12', speaker: 'user-001', text: "We will. Mike will run the analysis. It will be an estimate, not tax advice, and I'll contact your CPA so they are part of the decision." },
  { id: 't-13', speaker: 'cli-002', text: "We have Robert's Vanguard 401(k) and my TIAA 403(b) sitting outside. Would it make sense to bring them here?" },
  { id: 't-14', speaker: 'user-001', text: "I can't answer that today. Moving them needs a proper comparison first: the plans' fees, their services and their investment options against ours." },
  { id: 't-15', speaker: 'user-001', text: 'Sarah will request the plan fee disclosures and your recent statements so we can make that comparison.' },
  { id: 't-16', speaker: 'cli-001', text: "That's fair." },
  { id: 't-17', speaker: 'user-001', text: "One more item on the Vanguard plan: the beneficiary on file doesn't match your estate plan." },
  { id: 't-18', speaker: 'cli-001', text: "I'll call the plan administrator to fix it." },
  { id: 't-19', speaker: 'user-001', text: "Sarah will send you our beneficiary checklist so you have everything they'll ask for." },
  { id: 't-20', speaker: 'cli-001', text: "I've been reading about ESG funds. Could the trust hold some?" },
  { id: 't-21', speaker: 'user-001', text: "We can look at alternatives, but the trust's investment policy statement would need a signed amendment before anything changes." },
  { id: 't-22', speaker: 'cli-001', text: "Then let's look at an amendment." },
  { id: 't-23', speaker: 'user-001', text: "I'll draft the amendment so we can go through it at the next meeting." },
  { id: 't-24', speaker: 'user-001', text: 'Otherwise the investment policy statement stays as signed; nothing else in it needs to change.' },
  { id: 't-25', speaker: 'cli-002', text: 'Agreed.' },
]

const TRANSCRIPTS: ReadonlyMap<string, readonly TranscriptLine[]> = new Map([['evt-010', JOHNSON_REVIEW_TRANSCRIPT]])

export function transcriptOf(eventId: string): readonly TranscriptLine[] | undefined {
  return TRANSCRIPTS.get(eventId)
}
```

- [ ] **Step 4: The meeting module**

Create `src/mocks/workspace/meetings.ts`:

```ts
import type { VersionAuthor } from '@/types/workspace'
import type {
  AgendaItem, AgendaItemInput, AgendaVersion, Meeting, MeetingEvent, MeetingSummary, MeetingView, NoteLine,
} from '@/types/workspace-meeting'
import { calendarEvents } from '@/mocks/data/calendar'
import { clients } from '@/mocks/data/clients'
import { can, personById } from '@/mocks/data/people'
import { transcriptOf } from '@/mocks/data/meeting-transcripts'
import { advanceClockTo, nextAt, nextId, nextNumber, store } from '@/mocks/data/workspace-store'
import { fingerprint } from '@/lib/fingerprint'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { canSeeThread } from './visibility'

export type MeetingFailure = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string }
export type MeetingResult = { ok: true; meeting: Meeting } | MeetingFailure

export const refuseMeeting = (status: MeetingFailure['status'], code: string, message: string): MeetingFailure => ({ ok: false, status, code, message })
const NO_MEETING = refuseMeeting(404, 'NO_MEETING', 'Meeting not found.')
const TITLE_MAX = 200
const pad = (n: number) => String(n).padStart(4, '0')
const toUtc = (local: string) => new Date(local).toISOString()
const minuteOf = (iso: string) => Math.round((Date.parse(iso) - Date.parse(MOCK_NOW_ISO)) / 60_000)

/** A firm person's name from the directory, a client's from the CRM (Patricia is a client, not a viewer). */
function nameOf(id: string): string {
  const name = personById(id)?.name ?? clients.find((c) => c.id === id)?.fullName
  if (name === undefined) throw new Error(`No person or client "${id}"`)
  return name
}

/** The calendar event behind a meeting, in UTC, its attendees named. Undefined for an event with no household. */
export function meetingEvent(eventId: string): MeetingEvent | undefined {
  const e = calendarEvents.find((x) => x.id === eventId)
  if (!e || e.householdId === undefined || e.clientId === undefined) return undefined
  return {
    id: e.id, title: e.title, start: toUtc(e.startTime), end: toUtc(e.endTime), ...(e.location ? { location: e.location } : {}),
    attendees: e.attendees.map((id) => ({ id, name: nameOf(id) })), householdId: e.householdId, clientId: e.clientId,
  }
}

function eventOf(meeting: Meeting): MeetingEvent {
  const event = meetingEvent(meeting.eventId)
  if (!event) throw new Error(`Meeting ${meeting.eventId} names no calendar event with a household`)
  return event
}

export const meetingOf = (eventId: string): Meeting | undefined => store().meetings.find((m) => m.eventId === eventId)

export function meetingTitle(meeting: Meeting): string {
  const thread = store().threads.find((t) => t.id === meeting.threadId)
  if (!thread) throw new Error(`Meeting ${meeting.eventId} names a missing thread ${meeting.threadId}`)
  return thread.title
}

/** The meeting a viewer may read: a firm viewer who can see its thread. A client, or anyone else, is told it does not exist. */
export function visibleMeeting(viewerId: string, eventId: string): Meeting | undefined {
  const viewer = personById(viewerId)
  if (!viewer || viewer.role === 'client') return undefined
  const meeting = meetingOf(eventId)
  const thread = meeting && store().threads.find((t) => t.id === meeting.threadId)
  return meeting && thread && canSeeThread(viewerId, thread) ? meeting : undefined
}

function summaryOf(meeting: Meeting): MeetingSummary {
  const event = eventOf(meeting)
  return {
    eventId: meeting.eventId, title: meetingTitle(meeting), threadId: meeting.threadId, householdId: meeting.householdId, clientId: event.clientId,
    start: event.start, end: event.end, state: meeting.state, ...(meeting.filed ? { filedActId: meeting.filed.actId } : {}),
  }
}

/** The meetings a firm viewer may read; undefined for a client or an unknown viewer, whom the endpoint answers 404. */
export function meetingSummaries(viewerId: string): MeetingSummary[] | undefined {
  const viewer = personById(viewerId)
  if (!viewer || viewer.role === 'client') return undefined
  return store().meetings.filter((m) => visibleMeeting(viewerId, m.eventId) !== undefined).map(summaryOf)
}

/** The meeting as a firm viewer reads it; the transcript arrives only with the meeting held. */
export function meetingView(viewerId: string, eventId: string): MeetingView | undefined {
  const meeting = visibleMeeting(viewerId, eventId)
  if (!meeting) return undefined
  const transcript = meeting.state === 'scheduled' ? undefined : transcriptOf(meeting.eventId)
  return {
    ...summaryOf(meeting), event: eventOf(meeting), agenda: meeting.agenda, tasks: meeting.tasks,
    ...(meeting.heldAt ? { heldAt: meeting.heldAt } : {}),
    ...(meeting.notesDraft ? { notesDraft: meeting.notesDraft, notesFingerprint: notesFingerprint(meeting.notesDraft) } : {}),
    ...(meeting.filed ? { filed: meeting.filed } : {}),
    ...(transcript ? { transcript: [...transcript] } : {}),
  }
}

/** What a filing fingerprints: every line's id, section, text, citations, owner and due date, in order. */
export function notesFingerprint(lines: readonly NoteLine[]): string {
  return fingerprint(JSON.stringify(lines.map((l) => [l.id, l.section, l.text, l.cites, l.owner ?? null, l.due ?? null])))
}

/** A meeting the viewer may prepare: visible (else 404), and the viewer runs meetings (else 403). */
export function preparing(viewerId: string, eventId: string): MeetingResult {
  const meeting = visibleMeeting(viewerId, eventId)
  if (!meeting) return NO_MEETING
  if (!can(viewerId, 'prepare_meeting')) return refuseMeeting(403, 'NOT_PERMITTED', 'Only the advisor runs the meeting: prep, the agenda, holding it and its notes.')
  return { ok: true, meeting }
}

export function replaceMeeting(meeting: Meeting): void {
  const s = store()
  s.meetings = s.meetings.map((m) => (m.eventId === meeting.eventId ? meeting : m))
}

export const currentAgenda = (meeting: Meeting): AgendaVersion | undefined => meeting.agenda[meeting.agenda.length - 1]

/** Appends an agenda version and posts its line in the meeting thread. */
export function appendAgenda(meeting: Meeting, items: AgendaItem[], author: VersionAuthor, changeSummary: string): Meeting {
  const at = nextAt()
  const version: AgendaVersion = { n: meeting.agenda.length + 1, items, author, at }
  const next: Meeting = { ...meeting, agenda: [...meeting.agenda, version] }
  replaceMeeting(next)
  store().messages.push({ kind: 'agenda_version', id: nextId('msg'), threadId: meeting.threadId, at, eventId: meeting.eventId, version: version.n, author, changeSummary })
  return next
}

/** What changed between two agendas, in words; undefined when nothing did. */
export function agendaChangeSummary(before: readonly AgendaItem[], after: readonly AgendaItem[]): string | undefined {
  const beforeIds = new Set(before.map((i) => i.id))
  const afterIds = new Set(after.map((i) => i.id))
  const added = after.filter((i) => !beforeIds.has(i.id)).map((i) => `Added “${i.title}”`)
  const dropped = before.filter((i) => !afterIds.has(i.id)).map((i) => `Dropped “${i.title}”`)
  const renamed = after.flatMap((i) => {
    const old = before.find((b) => b.id === i.id)
    return old && old.title !== i.title ? [`Renamed “${old.title}” to “${i.title}”`] : []
  })
  const keptOrder = (items: readonly AgendaItem[], other: ReadonlySet<string>) => items.filter((i) => other.has(i.id)).map((i) => i.id).join('|')
  const reordered = keptOrder(before, afterIds) !== keptOrder(after, beforeIds) ? ['Reordered the agenda'] : []
  const parts = [...added, ...dropped, ...renamed, ...reordered]
  return parts.length === 0 ? undefined : `${parts.join('; ')}.`
}

/** Checks a whole agenda before any id is allocated, so a refused write burns none. */
function checkedAgenda(meeting: Meeting, items: readonly AgendaItemInput[]): { ok: true; items: AgendaItem[] } | MeetingFailure {
  if (items.length === 0) return refuseMeeting(400, 'EMPTY_AGENDA', 'An agenda needs at least one item.')
  const current = new Set((currentAgenda(meeting)?.items ?? []).map((i) => i.id))
  const findings = new Set(store().messages
    .filter((m) => m.threadId === meeting.threadId && (m.kind === 'agent_finding' || m.kind === 'carried')).map((m) => m.id))
  const seen = new Set<string>()
  for (const item of items) {
    const title = item.title.trim()
    if (title.length === 0) return refuseMeeting(400, 'TITLE_REQUIRED', 'Every agenda item needs a title.')
    if (title.length > TITLE_MAX) return refuseMeeting(400, 'TITLE_TOO_LONG', `Keep an agenda title to ${TITLE_MAX} characters or fewer.`)
    if (item.id !== undefined) {
      if (!current.has(item.id)) return refuseMeeting(400, 'UNKNOWN_ITEM', `${item.id} is not on the current agenda.`)
      if (seen.has(item.id)) return refuseMeeting(400, 'DUPLICATE_ITEM', `${item.id} appears twice.`)
      seen.add(item.id)
    }
    if (item.source.kind === 'finding' && !findings.has(item.source.messageId)) {
      return refuseMeeting(400, 'UNKNOWN_FINDING', 'An agenda item can carry only a finding posted or carried into the meeting thread.')
    }
  }
  return { ok: true, items: items.map((i) => ({ id: i.id ?? `ag-${pad(nextNumber('agenda'))}`, title: i.title.trim(), source: i.source })) }
}

export function reviseAgenda(viewerId: string, eventId: string, items: readonly AgendaItemInput[]): MeetingResult {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state !== 'scheduled') return refuseMeeting(409, 'MEETING_HELD', 'The meeting has been held; its agenda is closed.')
  const before = currentAgenda(meeting)?.items ?? []
  // Reject an unchanged agenda before allocating ids: compare with ids resolved against the current agenda.
  const shapeOnly = items.map((i, n) => ({ id: i.id ?? `new-${n}`, title: i.title.trim(), source: i.source }))
  if (items.length > 0 && agendaChangeSummary(before, shapeOnly) === undefined) return refuseMeeting(400, 'NO_CHANGE', 'The agenda is unchanged.')
  const checked = checkedAgenda(meeting, items)
  if (!checked.ok) return checked
  const summary = agendaChangeSummary(before, checked.items)
  if (summary === undefined) throw new Error('An agenda that differs in shape must differ once ids are allocated')
  return { ok: true, meeting: appendAgenda(meeting, checked.items, { kind: 'person', personId: viewerId }, summary) }
}

/** Holds the meeting: the clock moves to its end (never backwards), the held line is posted, the transcript becomes readable. */
export function holdMeeting(viewerId: string, eventId: string): MeetingResult {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state !== 'scheduled') return refuseMeeting(409, 'ALREADY_HELD', 'The meeting was already held.')
  const event = eventOf(meeting)
  advanceClockTo(minuteOf(event.end) - 1)
  const at = nextAt()
  const held: Meeting = { ...meeting, state: 'held', heldAt: { start: event.start, end: event.end } }
  replaceMeeting(held)
  store().messages.push({ kind: 'meeting_held', id: nextId('msg'), threadId: meeting.threadId, at, eventId: meeting.eventId, start: event.start, end: event.end })
  return { ok: true, meeting: held }
}
```

Note the order in `reviseAgenda`: an exact repeat of the current agenda answers `NO_CHANGE` before the per-item checks; a malformed item answers its own code.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/data/__tests__/meeting-transcript.test.ts src/mocks/workspace/__tests__/meetings.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 7: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/mocks/data/meeting-transcripts.ts src/mocks/workspace/meetings.ts \
  src/mocks/data/__tests__/meeting-transcript.test.ts src/mocks/workspace/__tests__/meetings.test.ts
git commit -m "feat(meetings): the transcript, the meeting read model, holding the meeting, agenda versions"
```

---
### Task 4: The Meeting Prep agent, and prep: findings and agenda v1

Meeting Prep measures the household from the engine — what changed today (the session's fills), the taxpayer's open wash-sale windows, drift against each account's model, the plan's goals, the held-away accounts outside the firm's view, the open items (the IPS signature state, the beneficiary discrepancy), and the RMD timing for each traditional IRA — and proposes an agenda ordered by attention. Its claims are digit-free; its figures and citations come from the engine.

**Files:**
- Create: `src/mocks/agents/meeting-prep.ts`, `src/mocks/data/open-items.ts`, `src/lib/rmd.ts`, `src/mocks/workspace/meeting-agents.ts`
- Modify: `src/workspace/thread/figure-format.ts` (`marksBreach`)
- Test: `src/lib/__tests__/rmd.test.ts` (new), `src/mocks/agents/__tests__/meeting-prep.test.ts` (new), `src/mocks/workspace/__tests__/meeting-prep-run.test.ts` (new), `src/workspace/__tests__/figure-format.test.ts`

**Interfaces:**
- Consumes: `AgentFinding` from `./agent`; `accounts`, `householdFixtures`, `heldAwayAssets`, `plans`, `documents`; `getPositionsForAccount` from `@/mocks/data/positions`; `openWashSaleWindows` from `@/mocks/data/realised-sales`; `ledgerFills` from `@/mocks/data/portfolio-ledger`; `computeDriftForAccount` from `@/mocks/handlers/pms`; `joinWords`, `firstNameOf` from `@/lib/words`; `runKeyOf` from `./run-key`; `preparing`, `refuseMeeting`, `appendAgenda`, `MeetingFailure` from `./meetings` (Task 3).
- Produces:

```ts
// src/lib/rmd.ts
export function requiredBeginningAge(dateOfBirth: string): number    // 73 for 1951–1959, 75 from 1960
export function firstRmdYear(dateOfBirth: string): number            // '1958-03-22' → 2031

// src/mocks/data/open-items.ts
export type OpenItemFixture = { id: string; householdId: string; text: string; claim: string; agendaWords: string; source: string; asOf: string }
export const OPEN_ITEMS: readonly OpenItemFixture[]

// src/mocks/agents/meeting-prep.ts
export type PrepFinding = AgentFinding & { agendaTitle: string }
export function runMeetingPrepAgent(householdId: string, asOf: string): PrepFinding[]
export const AGENDA_V1_SUMMARY = 'Proposed an agenda ordered by what needs attention first.'

// src/mocks/workspace/meeting-agents.ts
export type AgentMessage = Extract<Message, { kind: 'agent_finding' }>
export function runMeetingPrep(viewerId: string, eventId: string): { ok: true; meeting: Meeting; findings: AgentMessage[]; created: boolean } | MeetingFailure
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/rmd.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { firstRmdYear, requiredBeginningAge } from '../rmd'

describe('required minimum distributions (SECURE 2.0)', () => {
  it('begin at seventy-three for owners born 1951–1959, seventy-five from 1960', () => {
    expect(requiredBeginningAge('1958-03-22')).toBe(73)
    expect(requiredBeginningAge('1951-01-01')).toBe(73)
    expect(requiredBeginningAge('1959-12-31')).toBe(73)
    expect(requiredBeginningAge('1960-07-11')).toBe(75)
  })
  it("Robert Johnson's first required distribution is for 2031", () => {
    expect(firstRmdYear('1958-03-22')).toBe(2031)
  })
  it('refuses an owner born before 1951, whose distributions began under the earlier ages', () => {
    expect(() => requiredBeginningAge('1948-12-01')).toThrow(/pre-SECURE 2.0/)
  })
})
```

Create `src/mocks/agents/__tests__/meeting-prep.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { runMeetingPrepAgent } from '../meeting-prep'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { approvedV1, release } from '@/mocks/workspace/__tests__/story-fixture'

const PLAN_NAMES = /401\(k\)|403\(b\)/g
const johnsonAccounts = accounts.filter((a) => a.householdId === 'hh-001')
const titled = (findings: ReturnType<typeof runMeetingPrepAgent>, title: string) => {
  const f = findings.find((x) => x.agendaTitle === title)
  if (!f) throw new Error(`no finding titled "${title}" in ${findings.map((x) => x.agendaTitle).join(' | ')}`)
  return f
}

describe('Meeting Prep', () => {
  const findings = runMeetingPrepAgent('hh-001', MOCK_NOW_ISO)

  it('reports seven findings, each with a digit-free claim and agenda title, a citation and its as-of', () => {
    expect(findings).toHaveLength(7)
    for (const f of findings) {
      expect(f.claim.replace(PLAN_NAMES, ''), f.claim).not.toMatch(/\d/)
      expect(f.agendaTitle, f.agendaTitle).not.toMatch(/\d/)
      expect(f.citations.length, f.claim).toBeGreaterThan(0)
    }
  })

  it('before any fill: no orders filled today', () => {
    expect(titled(findings, 'Changes since the last review')).toMatchObject({ claim: "No orders have been filled in the household's accounts today.", attention: 'info', figures: [] })
  })

  it("states the taxpayer's open windows, figures and dates from the realised-sales ledger", () => {
    const windows = titled(findings, 'Wash-sale windows: what not to buy back')
    expect(windows.attention).toBe('attention')
    expect(windows.claim).toContain("in any of the taxpayer's accounts, including IRAs and held-away plans")
    expect(windows.claim).not.toMatch(/household/i)
    expect(windows.figures).toContainEqual({ label: 'INTC loss · rs-001', value: -32_750, unit: 'USD', source: 'realisedSales.realisedGainLoss' })
    expect(windows.citations.map((c) => c.source)).toContain('Wash-sale window · rs-001 · INTC loss sale of 2026-02-20, open through 2026-03-22')
  })

  it('reads drift for every Johnson account from the drift engine', () => {
    const outside = johnsonAccounts.filter((a) => computeDriftForAccount(a).needsRebalance)
    const drift = findings.find((f) => f.citations.some((c) => c.source.startsWith('Drift calculation')))!
    expect(drift.citations.map((c) => c.source)).toEqual(johnsonAccounts.map((a) => `Drift calculation · ${a.name}`))
    expect(drift.attention).toBe(outside.length > 0 ? 'attention' : 'info')
    expect(drift.figures.filter((f) => f.label.startsWith('Tolerance · ')).map((f) => f.label)).toEqual(outside.map((a) => `Tolerance · ${a.name}`))
  })

  it("states the plan's goals: the legacy goal at risk, with probability and funded status", () => {
    const goals = titled(findings, 'Plan goals at risk: Legacy / Estate')
    expect(goals).toMatchObject({ claim: 'In the financial plan, Legacy / Estate is at risk; Retirement Income is on track.', attention: 'attention' })
    expect(goals.figures).toContainEqual({ label: 'Probability · Legacy / Estate', value: 0.78, unit: '%', source: 'plan.goals.probability' })
    expect(goals.figures).toContainEqual({ label: 'Funded · Legacy / Estate', value: 0.85, unit: '%', source: 'plan.goals.currentFunding / targetAmount' })
    expect(goals.citations).toEqual([{ source: 'Financial plan · plan-001', asOf: '2025-11-15' }])
  })

  it('flags the held-away plans as outside the firm\'s view, and still inside the taxpayer\'s windows', () => {
    const held = titled(findings, 'Held-away accounts')
    expect(held.claim).toBe("Robert's Vanguard account and Patricia's TIAA account are held away: the firm does not manage them and cannot see their holdings, and a purchase there still counts for the taxpayer's wash-sale windows.")
    expect(held.figures.map((f) => [f.label, f.value])).toEqual([['Vanguard 401(k) — Former employer', 2_400_000], ['TIAA 403(b) — University', 1_500_000]])
  })

  it('states the open items: the IPS signature state and the Vanguard beneficiary', () => {
    const items = titled(findings, 'Open items: the IPS and the Vanguard beneficiary')
    expect(items).toMatchObject({ attention: 'attention', claim: "The investment policy statement is signed; the beneficiary on Robert's Vanguard plan does not match the estate plan." })
    expect(items.citations.map((c) => c.source)).toEqual(['Document · doc-001 · Johnson Family Trust — IPS', 'Client communication · comm-014'])
  })

  it("times the Roth-conversion window to Robert's first required distribution, from his date of birth", () => {
    const rmd = titled(findings, 'Roth conversions before required distributions')
    expect(rmd.citations.map((c) => c.source)).toEqual(['Required beginning · Robert Johnson, born 1958-03-22 · first required distribution for 2031 (age 73, SECURE 2.0)'])
    const ira = accounts.find((a) => a.id === 'acc-003')!
    const value = getPositionsForAccount(ira.id, ira.totalValue).reduce((s, p) => s + p.marketValue, 0)
    expect(rmd.figures).toEqual([{ label: 'Robert Johnson Traditional IRA', value, unit: 'USD', source: 'positions.marketValue' }])
    expect(rmd.claim).toMatch(/estimate/)
  })

  it('after the morning fills: the changes name the moved account, and the new window is open', () => {
    release(approvedV1())
    const after = runMeetingPrepAgent('hh-001', '2026-02-25T15:00:00.000Z')
    const changes = titled(after, "This morning's rebalance and harvest")
    expect(changes.claim).toBe('Orders released today were filled in Robert Johnson Individual; the readings below are of the moved book.')
    expect(changes.figures.map((f) => f.label)).toEqual(['Sold today', 'Bought today'])
    expect(titled(after, 'Wash-sale windows: what not to buy back').citations.map((c) => c.source))
      .toContain('Wash-sale window · rs-006 · INTC loss sale of 2026-02-25, open through 2026-03-27')
  })
})
```

Create `src/mocks/workspace/__tests__/meeting-prep-run.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { runMeetingPrepAgent } from '@/mocks/agents/meeting-prep'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { holdMeeting, reviseAgenda } from '../meetings'
import { runMeetingPrep } from '../meeting-agents'
import { approvedV1, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const prepFindings = () => store().messages.filter((m) => m.kind === 'agent_finding' && m.agentId === 'meeting-prep')

describe('running prep', () => {
  it('posts the findings in the meeting thread and agenda v1, ordered attention first, each item carrying its finding', () => {
    const r = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(r.created).toBe(true)
    expect(r.findings.every((f) => f.threadId === 'th-johnson-meeting' && f.agentId === 'meeting-prep')).toBe(true)
    const measured = runMeetingPrepAgent('hh-001', MOCK_NOW_ISO)
    const expectedTitles = [...measured.filter((f) => f.attention === 'attention'), ...measured.filter((f) => f.attention === 'info')].map((f) => f.agendaTitle)
    const v1 = store().meetings[0]!.agenda[0]!
    expect(v1.author).toEqual({ kind: 'agent', agentId: 'meeting-prep' })
    expect(v1.items.map((i) => i.title)).toEqual(expectedTitles)
    expect(v1.items[0]!.title).toBe('Wash-sale windows: what not to buy back')
    for (const item of v1.items) expect(r.findings.map((f) => f.id)).toContain(item.source.kind === 'finding' ? item.source.messageId : 'none')
    const line = store().messages.find((m) => m.kind === 'agenda_version')
    expect(line).toMatchObject({ version: 1, author: { kind: 'agent', agentId: 'meeting-prep' }, changeSummary: 'Proposed an agenda ordered by what needs attention first.' })
    expect(Date.parse(line!.at)).toBeGreaterThan(Date.parse(r.findings[0]!.at))
  })

  it('repeating prep returns the same findings and posts no second agenda', () => {
    const first = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    const again = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(again.created).toBe(false)
    expect(again.findings.map((f) => f.id)).toEqual(first.findings.map((f) => f.id))
    expect(prepFindings()).toHaveLength(first.findings.length)
    expect(store().meetings[0]!.agenda).toHaveLength(1)
  })

  it('after the book moves, prep measures again; the agenda Adrian already has is left alone', () => {
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    release(approvedV1())
    const again = ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(again.created).toBe(true)
    expect(again.findings.some((f) => f.claim.startsWith('Orders released today were filled'))).toBe(true)
    expect(store().meetings[0]!.agenda).toHaveLength(1)
  })

  it('an agenda Adrian started before prep is not replaced', () => {
    ok(reviseAgenda(ADRIAN, 'evt-010', [{ title: 'ESG alternatives for the trust', source: { kind: 'advisor' } }]))
    ok(runMeetingPrep(ADRIAN, 'evt-010'))
    expect(store().meetings[0]!.agenda.map((v) => v.author.kind)).toEqual(['person'])
  })

  it('only the advisor runs prep; a client is told the meeting does not exist; prep closes once the meeting is held', () => {
    expect(runMeetingPrep('user-002', 'evt-010')).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    expect(runMeetingPrep('cli-001', 'evt-010')).toMatchObject({ status: 404, code: 'NO_MEETING' })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(runMeetingPrep(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'MEETING_HELD' })
    expect(prepFindings()).toEqual([])
  })
})
```

In `src/workspace/__tests__/figure-format.test.ts`, add `marksBreach` to the import from `@/workspace/thread/figure-format` and append:

```ts
describe('meeting prep findings', () => {
  it('need discussion, not a breach code', () => {
    expect(marksBreach({ agentId: 'meeting-prep', attention: 'attention' })).toBe(false)
    expect(marksBreach({ agentId: 'drift-monitor', attention: 'attention' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/rmd.test.ts src/mocks/agents/__tests__/meeting-prep.test.ts src/mocks/workspace/__tests__/meeting-prep-run.test.ts src/workspace/__tests__/figure-format.test.ts --testTimeout 30000`
Expected: FAIL — the modules do not exist; `marksBreach` marks a prep finding.

- [ ] **Step 3: The RMD rule and the open items**

Create `src/lib/rmd.ts`:

```ts
/**
 * When a traditional IRA owner's required minimum distributions begin (IRC §401(a)(9) as amended by
 * SECURE 2.0 §107): the year they reach 73 if born 1951–1959, 75 if born 1960 or later. The statute's
 * text puts 1959 in both bands; the proposed regulations read it as 73, and so does this rule. An owner
 * born before 1951 began under the earlier ages (70½ or 72), which this rule does not state.
 */
export function requiredBeginningAge(dateOfBirth: string): number {
  const year = Number(dateOfBirth.slice(0, 4))
  if (!Number.isInteger(year) || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw new Error(`not a date of birth: ${dateOfBirth}`)
  if (year < 1951) throw new Error(`born ${year}: distributions began under the pre-SECURE 2.0 ages, which this rule does not cover`)
  return year <= 1959 ? 73 : 75
}

/** The calendar year of the first required distribution: the year the owner reaches the required beginning age. */
export function firstRmdYear(dateOfBirth: string): number {
  return Number(dateOfBirth.slice(0, 4)) + requiredBeginningAge(dateOfBirth)
}
```

Create `src/mocks/data/open-items.ts`:

```ts
/**
 * Items the firm has on file to resolve with a household, each from the record that raised it. `text`
 * is how a full view states it; `claim` is how an agent says it (digit-free); `agendaWords` name it in
 * an agenda title.
 */
export type OpenItemFixture = { id: string; householdId: string; text: string; claim: string; agendaWords: string; source: string; asOf: string }

export const OPEN_ITEMS: readonly OpenItemFixture[] = [
  {
    id: 'oi-001', householdId: 'hh-001',
    text: "The beneficiary on Robert Johnson's held-away Vanguard 401(k) (ha-001) does not match the estate plan; Robert is to contact the plan administrator.",
    claim: "the beneficiary on Robert's Vanguard plan does not match the estate plan",
    agendaWords: 'the Vanguard beneficiary',
    source: 'comm-014', asOf: '2026-02-03T13:00:00Z',
  },
]
```

- [ ] **Step 4: The agent**

Create `src/mocks/agents/meeting-prep.ts`:

```ts
import type { Account } from '@/types/account'
import type { HouseholdFixture } from '@/types/household'
import type { AgentFinding } from './agent'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { plans } from '@/mocks/data/planning'
import { documents } from '@/mocks/data/documents'
import { OPEN_ITEMS } from '@/mocks/data/open-items'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import { ledgerFills } from '@/mocks/data/portfolio-ledger'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { firstNameOf, joinWords } from '@/lib/words'
import { firstRmdYear, requiredBeginningAge } from '@/lib/rmd'

/** A finding, and the agenda title it proposes. */
export type PrepFinding = AgentFinding & { agendaTitle: string }

export const AGENDA_V1_SUMMARY = 'Proposed an agenda ordered by what needs attention first.'

const hasDigit = (text: string) => /\d/.test(text)
const isOrAre = (n: number) => (n === 1 ? 'is' : 'are')
/** How a claim names an account or a goal: claims carry no digits. */
const accountWords = (a: Account) => (hasDigit(a.name) ? 'an account' : a.name)
const goalWords = (name: string) => (hasDigit(name) ? 'a goal' : name)
const valueOf = (a: Account) => getPositionsForAccount(a.id, a.totalValue).reduce((s, p) => s + p.marketValue, 0)

function householdOf(householdId: string): HouseholdFixture {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household) throw new Error(`Meeting Prep: unknown household ${householdId}`)
  return household
}

function memberName(household: HouseholdFixture, clientId: string): string {
  const member = household.members.find((m) => m.clientId === clientId)
  if (!member) throw new Error(`Meeting Prep: ${clientId} is not a member of ${household.id}`)
  return member.name
}

/** What changed today: the session's fills in the household's accounts. */
function changes(own: readonly Account[], asOf: string): PrepFinding {
  const ids = new Set(own.map((a) => a.id))
  const fills = ledgerFills().filter((f) => ids.has(f.accountId))
  if (fills.length === 0) {
    return { claim: "No orders have been filled in the household's accounts today.", attention: 'info', figures: [], citations: [{ source: 'Fills recorded this session', asOf }], agendaTitle: 'Changes since the last review' }
  }
  const moved = own.filter((a) => fills.some((f) => f.accountId === a.id))
  const total = (side: 'buy' | 'sell') => fills.filter((f) => f.side === side).reduce((s, f) => s + f.value, 0)
  return {
    claim: `Orders released today were filled in ${joinWords(moved.map(accountWords))}; the readings below are of the moved book.`,
    attention: 'info',
    figures: [
      { label: 'Sold today', value: total('sell'), unit: 'USD', source: 'ledgerFills.value' },
      { label: 'Bought today', value: total('buy'), unit: 'USD', source: 'ledgerFills.value' },
    ],
    citations: moved.map((a) => ({ source: `Fills · ${a.name}`, asOf })),
    agendaTitle: "This morning's rebalance and harvest",
  }
}

/** The taxpayer's open loss-sale windows, from the realised-sales ledger (fixtures and the session's fills). */
function windows(householdId: string, asOf: string): PrepFinding {
  const open = openWashSaleWindows(asOf.slice(0, 10), householdId)
  if (open.length === 0) {
    return { claim: 'The taxpayer has no open wash-sale window.', attention: 'info', figures: [], citations: [{ source: `Realised sales · ${householdId}`, asOf }], agendaTitle: 'Wash-sale windows' }
  }
  return {
    claim: "The taxpayer has open wash-sale windows: what was sold at a loss must not be bought back in any of the taxpayer's accounts, including IRAs and held-away plans, before each window closes, and reinvested dividends count as buying.",
    attention: 'attention',
    figures: open.flatMap((w) => [
      { label: `${w.symbol} loss · ${w.id}`, value: w.realisedGainLoss, unit: 'USD' as const, source: 'realisedSales.realisedGainLoss' },
      { label: `Days until the ${w.symbol} window closes · ${w.id}`, value: w.daysRemaining, unit: 'd' as const, source: 'openWashSaleWindows.daysRemaining' },
    ]),
    citations: open.map((w) => ({ source: `Wash-sale window · ${w.id} · ${w.symbol} loss sale of ${w.saleDate}, open through ${w.end}`, asOf })),
    agendaTitle: 'Wash-sale windows: what not to buy back',
  }
}

/** Each managed account against its model, from the drift engine. */
function drift(own: readonly Account[], asOf: string): PrepFinding {
  const readings = own.map((account) => ({ account, reading: computeDriftForAccount(account) }))
  const outside = readings.filter(({ reading }) => reading.needsRebalance && reading.assetClassDrifts.length > 0)
  const citations = readings.map(({ account }) => ({ source: `Drift calculation · ${account.name}`, asOf }))
  if (outside.length === 0) {
    return { claim: 'Every managed account in the household is inside its tolerance band.', attention: 'info', figures: [], citations, agendaTitle: 'Allocation against the models' }
  }
  const one = outside.length === 1
  return {
    claim: `${joinWords(outside.map(({ account }) => accountWords(account)))} ${isOrAre(outside.length)} outside ${one ? 'its' : 'their'} tolerance band${one ? '' : 's'}.`,
    attention: 'attention',
    figures: outside.flatMap(({ account, reading }) => {
      const worst = reading.assetClassDrifts.reduce((x, y) => (Math.abs(y.drift) > Math.abs(x.drift) ? y : x))
      return [
        { label: `Largest drift · ${account.name}`, value: worst.drift, unit: 'pp' as const, source: 'drift.assetClassDrifts' },
        { label: `Tolerance · ${account.name}`, value: reading.driftTolerance, unit: 'pp' as const, source: 'drift.driftTolerance' },
      ]
    }),
    citations,
    agendaTitle: 'Accounts outside their bands',
  }
}

/** The financial plan's goals: probability and funded status. */
function goals(householdId: string): PrepFinding | undefined {
  const plan = plans.find((p) => p.householdId === householdId)
  if (!plan) return undefined
  const atRisk = plan.goals.filter((g) => g.status === 'at_risk' || g.status === 'off_track')
  const onTrack = plan.goals.filter((g) => g.status === 'on_track')
  const phrase = (gs: typeof plan.goals, state: string) => (gs.length > 0 ? [`${joinWords(gs.map((g) => goalWords(g.name)))} ${isOrAre(gs.length)} ${state}`] : [])
  return {
    claim: `In the financial plan, ${[...phrase(atRisk, 'at risk'), ...phrase(onTrack, 'on track')].join('; ')}.`,
    attention: atRisk.length > 0 ? 'attention' : 'info',
    figures: plan.goals.flatMap((g) => [
      { label: `Probability · ${g.name}`, value: g.probability, unit: '%' as const, source: 'plan.goals.probability' },
      { label: `Funded · ${g.name}`, value: g.currentFunding / g.targetAmount, unit: '%' as const, source: 'plan.goals.currentFunding / targetAmount' },
    ]),
    citations: [{ source: `Financial plan · ${plan.id}`, asOf: plan.lastUpdated }],
    agendaTitle: atRisk.length > 0 ? `Plan goals at risk: ${joinWords(atRisk.map((g) => goalWords(g.name)))}` : 'Plan goals',
  }
}

/** Accounts held away: outside the firm's view, still inside the taxpayer's wash-sale windows. */
function heldAway(household: HouseholdFixture): PrepFinding | undefined {
  const held = heldAwayAssets.filter((h) => h.householdId === household.id)
  if (held.length === 0) return undefined
  const one = held.length === 1
  const names = held.map((h) => `${firstNameOf(memberName(household, h.clientId))}'s ${h.institutionName} account`)
  return {
    claim: `${joinWords(names)} ${isOrAre(held.length)} held away: the firm does not manage ${one ? 'it' : 'them'} and cannot see ${one ? 'its' : 'their'} holdings, and a purchase there still counts for the taxpayer's wash-sale windows.`,
    attention: 'info',
    figures: held.map((h) => ({ label: `${h.institutionName} ${h.accountType}`, value: h.estimatedValue, unit: 'USD' as const, source: 'heldAwayAssets.estimatedValue' })),
    citations: held.map((h) => ({ source: `Held-away assets · ${h.id} · ${h.institutionName}`, asOf: h.lastUpdated })),
    agendaTitle: 'Held-away accounts',
  }
}

/** The IPS's signature state, and the items on file to resolve. */
function openItems(household: HouseholdFixture): PrepFinding | undefined {
  const members = new Set(household.members.map((m) => m.clientId))
  const ips = documents.find((d) => d.type === 'ips' && members.has(d.clientId))
  const items = OPEN_ITEMS.filter((i) => i.householdId === household.id)
  if (!ips && items.length === 0) return undefined
  const ipsWords = !ips ? 'No investment policy statement is on file'
    : ips.signatureStatus === 'signed' ? 'The investment policy statement is signed' : 'The investment policy statement awaits signature'
  return {
    claim: `${[ipsWords, ...items.map((i) => i.claim)].join('; ')}.`,
    attention: items.length > 0 || ips?.signatureStatus !== 'signed' ? 'attention' : 'info',
    figures: [],
    citations: [
      ...(ips ? [{ source: `Document · ${ips.id} · ${ips.name}`, asOf: ips.updatedAt }] : []),
      ...items.map((i) => ({ source: `Client communication · ${i.source}`, asOf: i.asOf })),
    ],
    agendaTitle: `Open items: ${joinWords(['the IPS', ...items.map((i) => i.agendaWords)])}`,
  }
}

/** Each traditional IRA owner's first required distribution: the years before it are when Roth conversions can be modelled. */
function rmd(household: HouseholdFixture, own: readonly Account[], asOf: string): PrepFinding | undefined {
  const iras = own.filter((a) => a.type === 'traditional_ira')
  if (iras.length === 0) return undefined
  const owners = iras.map((account) => ({ account, member: household.members.find((m) => m.clientId === account.clientId) }))
    .flatMap(({ account, member }) => (member ? [{ account, member }] : []))
  if (owners.length === 0) return undefined
  return {
    claim: `Required distributions from ${joinWords(owners.map(({ member }) => `${firstNameOf(member.name)}'s traditional IRA`))} begin in the year the citation states; the years before then are when Roth conversions can be modelled, as an estimate for the clients' tax professional to confirm.`,
    attention: 'info',
    figures: owners.map(({ account }) => ({ label: account.name, value: valueOf(account), unit: 'USD' as const, source: 'positions.marketValue' })),
    citations: owners.map(({ member }) => ({
      source: `Required beginning · ${member.name}, born ${member.dateOfBirth} · first required distribution for ${firstRmdYear(member.dateOfBirth)} (age ${requiredBeginningAge(member.dateOfBirth)}, SECURE 2.0)`,
      asOf,
    })),
    agendaTitle: 'Roth conversions before required distributions',
  }
}

/** The household measured for its review, in the order the agenda breaks ties. Scripted and deterministic. */
export function runMeetingPrepAgent(householdId: string, asOf: string): PrepFinding[] {
  const household = householdOf(householdId)
  const own = accounts.filter((a) => a.householdId === householdId)
  return [changes(own, asOf), windows(householdId, asOf), drift(own, asOf), goals(householdId), heldAway(household), openItems(household), rmd(household, own, asOf)]
    .flatMap((f) => (f ? [f] : []))
}
```

- [ ] **Step 5: Prep in the store**

Create `src/mocks/workspace/meeting-agents.ts`:

```ts
import type { Message } from '@/types/workspace'
import type { AgendaItem, Meeting } from '@/types/workspace-meeting'
import { nextAt, nextId, nextNumber, store } from '@/mocks/data/workspace-store'
import { AGENDA_V1_SUMMARY, runMeetingPrepAgent } from '@/mocks/agents/meeting-prep'
import { runKeyOf } from './run-key'
import { appendAgenda, preparing, refuseMeeting, type MeetingFailure } from './meetings'

export type AgentMessage = Extract<Message, { kind: 'agent_finding' }>

const pad = (n: number) => String(n).padStart(4, '0')

/**
 * Meeting Prep in the meeting thread: its findings, measured now, and — when the agenda is still
 * empty — agenda v1, attention first. A repeat for the same book returns the earlier findings.
 */
export function runMeetingPrep(viewerId: string, eventId: string): { ok: true; meeting: Meeting; findings: AgentMessage[]; created: boolean } | MeetingFailure {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  let { meeting } = prepared
  if (meeting.state !== 'scheduled') return refuseMeeting(409, 'MEETING_HELD', 'The meeting has been held; prep is closed.')
  const runKey = runKeyOf('meeting-prep', meeting.threadId, { type: 'household', id: meeting.householdId })
  const s = store()
  const existing = s.messages.filter((m): m is AgentMessage => m.kind === 'agent_finding' && m.runKey === runKey)
  if (existing.length > 0) return { ok: true, meeting, findings: existing, created: false }

  const asOf = nextAt()
  const measured = runMeetingPrepAgent(meeting.householdId, asOf)
  const findings: AgentMessage[] = measured.map(({ agendaTitle: _title, ...finding }) => ({
    kind: 'agent_finding', id: nextId('msg'), threadId: meeting.threadId, agentId: 'meeting-prep', at: asOf, runKey, ...finding,
  }))
  s.messages.push(...findings)
  if (meeting.agenda.length === 0) {
    const paired = measured.map((finding, i) => ({ finding, messageId: findings[i]?.id }))
    // Stable: attention first, then the order the agent measured in.
    const ranked = [...paired].sort((a, b) => Number(b.finding.attention === 'attention') - Number(a.finding.attention === 'attention'))
    const items: AgendaItem[] = ranked.map(({ finding, messageId }) => {
      if (!messageId) throw new Error('Every measured finding is posted')
      return { id: `ag-${pad(nextNumber('agenda'))}`, title: finding.agendaTitle, source: { kind: 'finding', messageId } }
    })
    meeting = appendAgenda(meeting, items, { kind: 'agent', agentId: 'meeting-prep' }, AGENDA_V1_SUMMARY)
  }
  return { ok: true, meeting, findings, created: true }
}
```

In `src/workspace/thread/figure-format.ts`, `marksBreach` becomes:

```ts
/**
 * Whether a finding marks a breach. OUT means outside a limit, as on the drift gauges; a harvest
 * opportunity needs a decision but breaches nothing, and a meeting's attention items need discussion,
 * so neither carries a code.
 */
export const marksBreach = ({ agentId, attention }: Pick<StatusFacts, 'agentId' | 'attention'>): boolean =>
  attention === 'attention' && agentId !== 'harvest-scanner' && agentId !== 'meeting-prep'
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/rmd.test.ts src/mocks/agents/__tests__/meeting-prep.test.ts src/mocks/workspace/__tests__/meeting-prep-run.test.ts src/workspace/__tests__/figure-format.test.ts --testTimeout 30000`
Expected: PASS. If the drift finding's attention for the Johnson accounts differs from what the test derives, the test is right (it reads the drift engine); fix the agent, not the test.

- [ ] **Step 7: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 8: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/lib/rmd.ts src/mocks/data/open-items.ts src/mocks/agents/meeting-prep.ts src/mocks/workspace/meeting-agents.ts src/workspace/thread/figure-format.ts \
  src/lib/__tests__/rmd.test.ts src/mocks/agents/__tests__/meeting-prep.test.ts src/mocks/workspace/__tests__/meeting-prep-run.test.ts src/workspace/__tests__/figure-format.test.ts
git commit -m "feat(meetings): the Meeting Prep agent measures the household and proposes agenda v1"
```

---
### Task 5: The Meeting Notes agent, the notes draft, and Adrian's edits

Once the meeting is held, Meeting Notes drafts the record from the transcript: discussion, decisions, client requests and follow-ups, each line citing the transcript lines it records. It records an owner only where the transcript states one and never adds a recommendation nobody made. Adrian edits the draft until it is filed; every edit is checked line by line.

**Files:**
- Create: `src/mocks/agents/meeting-notes.ts`
- Modify: `src/lib/trading-calendar.ts`, `src/mocks/workspace/meetings.ts` (add `meetingDay`, `saveNotes`), `src/mocks/workspace/meeting-agents.ts` (add `draftMeetingNotes`)
- Test: `src/lib/__tests__/trading-calendar.test.ts`, `src/mocks/agents/__tests__/meeting-notes.test.ts` (new), `src/mocks/workspace/__tests__/meeting-notes-run.test.ts` (new)

**Interfaces:**
- Consumes: `transcriptOf` (Task 3); `preparing`, `replaceMeeting`, `refuseMeeting`, `meetingOf` (Task 3); `isNoteSection`, `NoteLine`, `NoteLineInput`, `TaskOwner` (Task 2); `AGENTS`, `personById`; `isTradingDay`.
- Produces:

```ts
// src/lib/trading-calendar.ts
export function tradingDaysAfter(iso: string, n: number): string   // ('2026-02-25', 3) → '2026-03-02'

// src/mocks/agents/meeting-notes.ts
export function draftNotesFromTranscript(eventId: string, meetingDay: string): NoteLine[]

// src/mocks/workspace/meetings.ts (added)
export function meetingDay(meeting: Meeting): string                 // the event's calendar date, '2026-02-25'
export const NOTE_TEXT_MAX = 2000
export function saveNotes(viewerId: string, eventId: string, lines: readonly NoteLineInput[]): MeetingResult

// src/mocks/workspace/meeting-agents.ts (added)
export function draftMeetingNotes(viewerId: string, eventId: string): { ok: true; meeting: Meeting; created: boolean } | MeetingFailure
```

- [ ] **Step 1: Write the failing tests**

In `src/lib/__tests__/trading-calendar.test.ts`, add `tradingDaysAfter` to the import and append:

```ts
describe('tradingDaysAfter', () => {
  it('counts NYSE trading days forward, skipping weekends and holidays', () => {
    expect(tradingDaysAfter('2026-02-25', 1)).toBe('2026-02-26')
    expect(tradingDaysAfter('2026-02-25', 2)).toBe('2026-02-27')
    expect(tradingDaysAfter('2026-02-25', 3)).toBe('2026-03-02')
    expect(tradingDaysAfter('2026-02-25', 12)).toBe('2026-03-13')
    expect(tradingDaysAfter('2026-04-02', 1)).toBe('2026-04-06')
  })
  it('refuses a count that is not a whole number of days', () => {
    expect(() => tradingDaysAfter('2026-02-25', 0)).toThrow()
    expect(() => tradingDaysAfter('2026-02-25', 1.5)).toThrow()
  })
})
```

Create `src/mocks/agents/__tests__/meeting-notes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { draftNotesFromTranscript } from '../meeting-notes'
import { JOHNSON_REVIEW_TRANSCRIPT } from '@/mocks/data/meeting-transcripts'
import { personById } from '@/mocks/data/people'
import { isTradingDay } from '@/lib/trading-calendar'
import { firstNameOf } from '@/lib/words'

const PLAN_NAMES = /401\(k\)|403\(b\)/g
const notes = draftNotesFromTranscript('evt-010', '2026-02-25')
const transcript = new Map(JOHNSON_REVIEW_TRANSCRIPT.map((l) => [l.id, l]))
const toClient = notes.filter((l) => l.section === 'decisions' || l.section === 'client_requests')

describe('Meeting Notes', () => {
  it('drafts twenty lines in the four sections', () => {
    expect(notes.map((l) => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => `n-${String(i + 1).padStart(2, '0')}`))
    const count = (section: string) => notes.filter((l) => l.section === section).length
    expect([count('discussion'), count('decisions'), count('client_requests'), count('follow_ups')]).toEqual([7, 4, 3, 6])
  })

  it('cites at least one real transcript line on every line', () => {
    for (const line of notes) {
      expect(line.cites.length, line.id).toBeGreaterThan(0)
      for (const id of line.cites) expect(transcript.has(id), `${line.id} cites ${id}`).toBe(true)
    }
  })

  it('states no figure (the plan names aside)', () => {
    for (const line of notes) expect(line.text.replace(PLAN_NAMES, ''), line.id).not.toMatch(/\d/)
  })

  it('assigns each follow-up as the meeting did, due on a trading day', () => {
    expect(notes.filter((l) => l.section === 'follow_ups').map((l) => [l.id, l.owner, l.due])).toEqual([
      ['n-15', { kind: 'person', personId: 'user-003' }, '2026-03-02'],
      ['n-16', { kind: 'person', personId: 'user-003' }, '2026-03-06'],
      ['n-17', { kind: 'person', personId: 'user-001' }, '2026-02-27'],
      ['n-18', { kind: 'person', personId: 'user-002' }, '2026-03-04'],
      ['n-19', { kind: 'person', personId: 'user-002' }, '2026-02-26'],
      ['n-20', { kind: 'person', personId: 'user-001' }, '2026-03-13'],
    ])
    for (const line of notes.filter((l) => l.section === 'follow_ups')) expect(isTradingDay(line.due!), line.id).toBe(true)
    for (const line of notes.filter((l) => l.section !== 'follow_ups')) {
      expect(line.owner, line.id).toBeUndefined()
      expect(line.due, line.id).toBeUndefined()
    }
  })

  it('never chooses an owner: each is named, or speaks for themself, in a cited line', () => {
    for (const line of notes.filter((l) => l.section === 'follow_ups')) {
      if (line.owner?.kind !== 'person') throw new Error(`${line.id} has no person owner`)
      const owner = personById(line.owner.personId)!
      const cited = line.cites.map((id) => transcript.get(id)!)
      const named = cited.some((t) => t.text.includes(firstNameOf(owner.name)))
      const selfStated = cited.some((t) => t.speaker === owner.id && /\bI'll\b/.test(t.text))
      expect(named || selfStated, line.id).toBe(true)
    }
  })

  it('adds no recommendation nobody made; a rollover is only asked about', () => {
    for (const line of notes) expect(line.text, line.id).not.toMatch(/\bwe recommend|\brecommend (that|you)|\brecommends\b|should (roll|move|consolidate)/i)
    const rollover = toClient.filter((l) => /consolidat|roll ?over|401\(k\).*403\(b\)/i.test(l.text))
    expect(rollover.map((l) => l.id)).toEqual(['n-13'])
    for (const line of rollover) expect(line.text).toContain('asked about; comparison to follow')
  })

  it('every tax item the client will read carries the estimate wording', () => {
    const tax = toClient.filter((l) => /\btax\b|Roth|conversion/i.test(l.text))
    expect(tax.map((l) => l.id)).toEqual(['n-12'])
    for (const line of tax) expect(line.text).toContain('estimate; consult your tax professional')
  })

  it('names no colleague in a line the client will read, and scopes wash sales to the taxpayer', () => {
    for (const line of toClient) expect(line.text, line.id).not.toMatch(/Sarah|Mike|Mitchell|Chen/)
    for (const line of notes) expect(line.text, line.id).not.toMatch(/household/i)
  })

  it('has no script for a meeting without a transcript', () => {
    expect(() => draftNotesFromTranscript('evt-002', '2026-02-25')).toThrow(/no transcript/)
  })
})
```

Create `src/mocks/workspace/__tests__/meeting-notes-run.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { holdMeeting, meetingView, saveNotes } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { ok } from './story-fixture'
import type { NoteLine } from '@/types/workspace-meeting'

const ADRIAN = 'user-001'
const draft = () => store().meetings[0]!.notesDraft!
const held = () => ok(holdMeeting(ADRIAN, 'evt-010'))
const drafted = () => { held(); ok(draftMeetingNotes(ADRIAN, 'evt-010')) }
const edited = (lines: NoteLine[], id: string, text: string) => lines.map((l) => (l.id === id ? { ...l, text } : l))

describe('drafting the notes', () => {
  it('waits for the meeting to be held: no notes, and no transcript, before then', () => {
    expect(draftMeetingNotes(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'NOT_HELD' })
    expect(meetingView(ADRIAN, 'evt-010')?.transcript).toBeUndefined()
  })

  it('drafts once the meeting is held, and posts the notes line in the meeting thread', () => {
    held()
    const r = ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    expect(r.created).toBe(true)
    expect(draft()).toHaveLength(20)
    const line = store().messages.find((m) => m.kind === 'notes_drafted')
    expect(line).toMatchObject({ threadId: 'th-johnson-meeting', eventId: 'evt-010', agentId: 'meeting-notes' })
    const view = meetingView(ADRIAN, 'evt-010')!
    expect(view.notesDraft).toEqual(draft())
    expect(view.notesFingerprint).toMatch(/^[0-9A-F]{8}$/)
  })

  it("a second request keeps Adrian's edits and posts nothing new", () => {
    drafted()
    ok(saveNotes(ADRIAN, 'evt-010', edited(draft(), 'n-01', 'Reviewed the rebalance and the Intel harvest.')))
    expect(ok(draftMeetingNotes(ADRIAN, 'evt-010')).created).toBe(false)
    expect(draft()[0]!.text).toBe('Reviewed the rebalance and the Intel harvest.')
    expect(store().messages.filter((m) => m.kind === 'notes_drafted')).toHaveLength(1)
  })

  it('only the advisor drafts; a client is told the meeting does not exist', () => {
    held()
    expect(draftMeetingNotes('user-002', 'evt-010')).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    expect(draftMeetingNotes('cli-001', 'evt-010')).toMatchObject({ status: 404, code: 'NO_MEETING' })
  })
})

describe("Adrian's edits", () => {
  it('saves edited text, a removed line and a new cited line; the fingerprint follows', () => {
    drafted()
    const before = meetingView(ADRIAN, 'evt-010')!.notesFingerprint
    const lines = edited(draft(), 'n-01', '  Reviewed the rebalance and the Intel harvest.  ').filter((l) => l.id !== 'n-07')
    ok(saveNotes(ADRIAN, 'evt-010', [...lines, { section: 'discussion', text: 'Patricia agreed with the plan.', cites: ['t-25', 't-25'] }]))
    expect(draft()).toHaveLength(20)
    expect(draft()[0]!.text).toBe('Reviewed the rebalance and the Intel harvest.')
    expect(draft().map((l) => l.id)).not.toContain('n-07')
    expect(draft()[19]).toEqual({ id: 'n-0001', section: 'discussion', text: 'Patricia agreed with the plan.', cites: ['t-25'] })
    expect(meetingView(ADRIAN, 'evt-010')!.notesFingerprint).not.toBe(before)
  })

  it.each([
    ['NO_LINES', () => []],
    ['NOTE_TEXT_REQUIRED', () => edited(draft(), 'n-01', ' \n ')],
    ['NOTE_TEXT_TOO_LONG', () => edited(draft(), 'n-01', 'x'.repeat(2001))],
    ['CITATION_REQUIRED', () => draft().map((l) => (l.id === 'n-01' ? { ...l, cites: [] } : l))],
    ['UNKNOWN_CITATION', () => draft().map((l) => (l.id === 'n-01' ? { ...l, cites: ['t-99'] } : l))],
    ['UNKNOWN_LINE', () => draft().map((l) => (l.id === 'n-01' ? { ...l, id: 'n-77' } : l))],
    ['DUPLICATE_LINE', () => [...draft(), draft()[0]!]],
    ['FOLLOW_UP_INCOMPLETE', () => draft().map((l) => (l.id === 'n-15' ? { id: l.id, section: l.section, text: l.text, cites: l.cites } : l))],
    ['UNKNOWN_OWNER', () => draft().map((l) => (l.id === 'n-15' ? { ...l, owner: { kind: 'person' as const, personId: 'cli-001' } } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-15' ? { ...l, due: '2026-02-28' } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-15' ? { ...l, due: '2026-02-24' } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-15' ? { ...l, due: '2026-02-31' } : l))],
    ['DUE_NOT_TRADING_DAY', () => draft().map((l) => (l.id === 'n-15' ? { ...l, due: '2027-01-04' } : l))],
  ] as const)('refuses %s and leaves the draft as it was', (code, lines) => {
    drafted()
    const before = JSON.parse(JSON.stringify(draft())) as NoteLine[]
    expect(saveNotes(ADRIAN, 'evt-010', lines())).toMatchObject({ ok: false, status: 400, code })
    expect(draft()).toEqual(before)
  })

  it('needs a held meeting and a draft; only the advisor edits', () => {
    expect(saveNotes(ADRIAN, 'evt-010', [])).toMatchObject({ status: 409, code: 'NOT_HELD' })
    held()
    expect(saveNotes(ADRIAN, 'evt-010', [])).toMatchObject({ status: 409, code: 'NO_NOTES' })
    ok(draftMeetingNotes(ADRIAN, 'evt-010'))
    expect(saveNotes('user-003', 'evt-010', draft())).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/trading-calendar.test.ts src/mocks/agents/__tests__/meeting-notes.test.ts src/mocks/workspace/__tests__/meeting-notes-run.test.ts --testTimeout 30000`
Expected: FAIL — `tradingDaysAfter`, the agent, `draftMeetingNotes` and `saveNotes` do not exist.

- [ ] **Step 3: Trading days forward**

Append to `src/lib/trading-calendar.ts`:

```ts
/** The nth NYSE trading day after the date of `iso` (n ≥ 1): when something due "in n trading days" falls due. */
export function tradingDaysAfter(iso: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`tradingDaysAfter needs a whole number of days of at least one, not ${n}`)
  let date = utcDate(iso)
  let counted = 0
  while (counted < n) {
    date = new Date(date.getTime() + DAY_MS)
    if (isTradingDay(date.toISOString())) counted += 1
  }
  return date.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: The agent**

Create `src/mocks/agents/meeting-notes.ts`:

```ts
import type { NoteLine, NoteSection, TaskOwner } from '@/types/workspace-meeting'
import { transcriptOf } from '@/mocks/data/meeting-transcripts'
import { tradingDaysAfter } from '@/lib/trading-calendar'

/** A scripted line: what it records, the transcript lines it cites, and for a follow-up the owner the meeting named and when it is due. */
type ScriptLine = { id: string; section: NoteSection; text: string; cites: string[]; owner?: TaskOwner; dueInTradingDays?: number }

const ADRIAN: TaskOwner = { kind: 'person', personId: 'user-001' }
const SARAH: TaskOwner = { kind: 'person', personId: 'user-002' }
const MIKE: TaskOwner = { kind: 'person', personId: 'user-003' }

/**
 * What Meeting Notes records from the Johnson annual review. Each line records only what was said or
 * decided, citing where; a follow-up's owner is the one the meeting named in the cited line. The lines
 * the client will read (decisions and requests) speak in the firm's voice and name no colleague.
 */
const JOHNSON_REVIEW_NOTES: readonly ScriptLine[] = [
  { id: 'n-01', section: 'discussion', text: "Reviewed this morning's rebalance and the Intel harvest: the loss stands only if Intel is not bought back before its window closes.", cites: ['t-02'] },
  { id: 'n-02', section: 'discussion', text: 'Reviewed the plan: the legacy goal is at risk and the retirement goal is on track.', cites: ['t-06'] },
  { id: 'n-03', section: 'discussion', text: "Discussed Roth conversions in the years before Robert's required distributions begin.", cites: ['t-09', 't-10'] },
  { id: 'n-04', section: 'discussion', text: 'Discussed the held-away Vanguard 401(k) and TIAA 403(b); no recommendation was made.', cites: ['t-13', 't-14'] },
  { id: 'n-05', section: 'discussion', text: 'Reviewed the beneficiary on the Vanguard 401(k), which does not match the estate plan.', cites: ['t-17'] },
  { id: 'n-06', section: 'discussion', text: 'Discussed ESG alternatives for the trust.', cites: ['t-20', 't-21'] },
  { id: 'n-07', section: 'discussion', text: 'Reviewed the investment policy statement.', cites: ['t-24'] },
  { id: 'n-08', section: 'decisions', text: "Robert will not buy Intel back in any of his or Patricia's accounts, including the IRAs and the Vanguard 401(k), until its window closes; reinvested dividends count as buying.", cites: ['t-03', 't-04', 't-05'] },
  { id: 'n-09', section: 'decisions', text: 'We keep the legacy goal and will bring options to protect it to the next review.', cites: ['t-07', 't-08'] },
  { id: 'n-10', section: 'decisions', text: 'Robert will contact the Vanguard plan administrator to correct the beneficiary; we will send our beneficiary checklist.', cites: ['t-18', 't-19'] },
  { id: 'n-11', section: 'decisions', text: 'The investment policy statement stays as signed; an ESG change would need a signed amendment.', cites: ['t-21', 't-24', 't-25'] },
  { id: 'n-12', section: 'client_requests', text: "Model Roth conversion amounts for the years before Robert's required distributions begin. This is an estimate; consult your tax professional. We will involve your CPA.", cites: ['t-11', 't-12'] },
  { id: 'n-13', section: 'client_requests', text: 'Consolidating the Vanguard 401(k) and the TIAA 403(b): asked about; comparison to follow.', cites: ['t-13', 't-14', 't-15'] },
  { id: 'n-14', section: 'client_requests', text: 'Look at ESG alternatives for the trust, through a signed amendment to the investment policy statement.', cites: ['t-20', 't-22'] },
  { id: 'n-15', section: 'follow_ups', text: 'Plan scenarios for the legacy goal.', cites: ['t-08'], owner: MIKE, dueInTradingDays: 3 },
  { id: 'n-16', section: 'follow_ups', text: 'Roth conversion analysis.', cites: ['t-12'], owner: MIKE, dueInTradingDays: 7 },
  { id: 'n-17', section: 'follow_ups', text: "Contact the clients' CPA about the conversion analysis.", cites: ['t-12'], owner: ADRIAN, dueInTradingDays: 2 },
  { id: 'n-18', section: 'follow_ups', text: 'Request the plan fee disclosures and recent statements for the Vanguard 401(k) and the TIAA 403(b).', cites: ['t-15'], owner: SARAH, dueInTradingDays: 5 },
  { id: 'n-19', section: 'follow_ups', text: 'Send the beneficiary checklist.', cites: ['t-19'], owner: SARAH, dueInTradingDays: 1 },
  { id: 'n-20', section: 'follow_ups', text: 'Draft the IPS amendment for the next meeting.', cites: ['t-23'], owner: ADRIAN, dueInTradingDays: 12 },
]

const SCRIPTS: ReadonlyMap<string, readonly ScriptLine[]> = new Map([['evt-010', JOHNSON_REVIEW_NOTES]])

/** The notes as Meeting Notes drafts them: scripted, deterministic, every citation checked against the transcript. */
export function draftNotesFromTranscript(eventId: string, meetingDay: string): NoteLine[] {
  const script = SCRIPTS.get(eventId)
  const transcript = transcriptOf(eventId)
  if (!script || !transcript) throw new Error(`Meeting Notes: no transcript for ${eventId}`)
  const ids = new Set(transcript.map((l) => l.id))
  return script.map(({ dueInTradingDays, owner, ...line }) => {
    if (line.cites.length === 0 || line.cites.some((id) => !ids.has(id))) throw new Error(`Meeting Notes: ${line.id} cites a line the transcript does not have`)
    if (line.section !== 'follow_ups') return { ...line, cites: [...line.cites] }
    if (!owner || dueInTradingDays === undefined) throw new Error(`Meeting Notes: follow-up ${line.id} needs the owner the meeting named and a due date`)
    return { ...line, cites: [...line.cites], owner, due: tradingDaysAfter(meetingDay, dueInTradingDays) }
  })
}
```

- [ ] **Step 5: The draft and the edits**

In `src/mocks/workspace/meetings.ts`, extend the imports:

```ts
import type { NoteLineInput, TaskOwner } from '@/types/workspace-meeting'
import { isNoteSection } from '@/types/workspace-meeting'
import { AGENTS } from '@/mocks/data/people'
import { isTradingDay } from '@/lib/trading-calendar'
```

(merge them into the existing import statements from those modules) and append:

```ts
export const NOTE_TEXT_MAX = 2000
const FIRST_CALENDAR_YEAR = 2022
const LAST_CALENDAR_YEAR = 2026

/** The meeting's calendar date where it happens (Eastern), from its event. */
export function meetingDay(meeting: Meeting): string {
  const event = calendarEvents.find((e) => e.id === meeting.eventId)
  if (!event) throw new Error(`Meeting ${meeting.eventId} names no calendar event`)
  return event.startTime.slice(0, 10)
}

/** A real date the firm's NYSE calendar covers, on which the exchange trades. */
function isDueDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const date = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) return false
  const year = date.getUTCFullYear()
  return year >= FIRST_CALENDAR_YEAR && year <= LAST_CALENDAR_YEAR && isTradingDay(day)
}

const isOwner = (owner: TaskOwner): boolean => (owner.kind === 'person'
  ? personById(owner.personId) !== undefined && personById(owner.personId)?.role !== 'client'
  : AGENTS.some((a) => a.id === owner.agentId))

/** Every line checked before anything is saved: section, text, citations, ids, and a follow-up's owner and due date. */
function lineRefusal(meeting: Meeting, input: readonly NoteLineInput[]): MeetingFailure | undefined {
  if (input.length === 0) return refuseMeeting(400, 'NO_LINES', 'The notes need at least one line.')
  const transcript = new Set((transcriptOf(meeting.eventId) ?? []).map((l) => l.id))
  const existing = new Set((meeting.notesDraft ?? []).map((l) => l.id))
  const day = meetingDay(meeting)
  const seen = new Set<string>()
  for (const line of input) {
    if (!isNoteSection(line.section)) return refuseMeeting(400, 'BAD_SECTION', 'A line belongs to discussion, decisions, client requests or follow-ups.')
    const text = line.text.trim()
    if (text.length === 0) return refuseMeeting(400, 'NOTE_TEXT_REQUIRED', 'Every line needs its text.')
    if (text.length > NOTE_TEXT_MAX) return refuseMeeting(400, 'NOTE_TEXT_TOO_LONG', `Keep a line to ${NOTE_TEXT_MAX} characters or fewer.`)
    if (line.cites.length === 0) return refuseMeeting(400, 'CITATION_REQUIRED', 'Every line cites the transcript line it records.')
    const unknown = line.cites.find((id) => !transcript.has(id))
    if (unknown !== undefined) return refuseMeeting(400, 'UNKNOWN_CITATION', `${unknown} is not a line of the transcript.`)
    if (line.id !== undefined) {
      if (!existing.has(line.id)) return refuseMeeting(400, 'UNKNOWN_LINE', `${line.id} is not a line of the draft.`)
      if (seen.has(line.id)) return refuseMeeting(400, 'DUPLICATE_LINE', `${line.id} appears twice.`)
      seen.add(line.id)
    }
    if (line.section === 'follow_ups') {
      if (!line.owner || line.due === undefined) return refuseMeeting(400, 'FOLLOW_UP_INCOMPLETE', 'A follow-up needs an owner and a due date.')
      if (!isOwner(line.owner)) return refuseMeeting(400, 'UNKNOWN_OWNER', 'A follow-up is owned by someone at the firm or by an agent.')
      if (!isDueDay(line.due) || line.due < day) {
        return refuseMeeting(400, 'DUE_NOT_TRADING_DAY', `A due date is an NYSE trading day on or after the meeting (${day}), within the calendar the firm holds (through ${LAST_CALENDAR_YEAR}).`)
      }
    }
  }
  return undefined
}

/** Adrian's edits to the notes draft, until it is filed. Nothing is saved unless every line passes. */
export function saveNotes(viewerId: string, eventId: string, input: readonly NoteLineInput[]): MeetingResult {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state === 'scheduled') return refuseMeeting(409, 'NOT_HELD', 'Hold the meeting first: the notes are drafted from its transcript.')
  if (meeting.state === 'filed') return refuseMeeting(409, 'ALREADY_FILED', `The record was already filed (${meeting.filed?.actId ?? 'unknown'}); it cannot be edited.`)
  if (!meeting.notesDraft) return refuseMeeting(409, 'NO_NOTES', 'Ask Meeting Notes for a draft first.')
  const refusal = lineRefusal(meeting, input)
  if (refusal) return refusal
  const lines: NoteLine[] = input.map((l) => ({
    id: l.id ?? `n-${pad(nextNumber('note'))}`, section: l.section, text: l.text.trim(), cites: [...new Set(l.cites)],
    ...(l.section === 'follow_ups' && l.owner && l.due !== undefined ? { owner: l.owner, due: l.due } : {}),
  }))
  const next: Meeting = { ...meeting, notesDraft: lines }
  replaceMeeting(next)
  return { ok: true, meeting: next }
}
```

In `src/mocks/workspace/meeting-agents.ts`, extend the imports (`draftNotesFromTranscript` from `@/mocks/agents/meeting-notes`, `meetingDay` and `replaceMeeting` from `./meetings`) and append:

```ts
/** Meeting Notes drafts the record from the transcript, once the meeting is held; a second request keeps the draft as Adrian left it. */
export function draftMeetingNotes(viewerId: string, eventId: string): { ok: true; meeting: Meeting; created: boolean } | MeetingFailure {
  const prepared = preparing(viewerId, eventId)
  if (!prepared.ok) return prepared
  const { meeting } = prepared
  if (meeting.state === 'scheduled') return refuseMeeting(409, 'NOT_HELD', 'Hold the meeting first: the notes are drafted from its transcript.')
  if (meeting.state === 'filed') return refuseMeeting(409, 'ALREADY_FILED', `The record was already filed (${meeting.filed?.actId ?? 'unknown'}).`)
  if (meeting.notesDraft) return { ok: true, meeting, created: false }
  const next: Meeting = { ...meeting, notesDraft: draftNotesFromTranscript(meeting.eventId, meetingDay(meeting)) }
  replaceMeeting(next)
  store().messages.push({ kind: 'notes_drafted', id: nextId('msg'), threadId: meeting.threadId, at: nextAt(), eventId: meeting.eventId, agentId: 'meeting-notes' })
  return { ok: true, meeting: next, created: true }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/trading-calendar.test.ts src/mocks/agents/__tests__/meeting-notes.test.ts src/mocks/workspace/__tests__/meeting-notes-run.test.ts src/mocks/workspace/__tests__/meetings.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 8: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/lib/trading-calendar.ts src/mocks/agents/meeting-notes.ts src/mocks/workspace/meetings.ts src/mocks/workspace/meeting-agents.ts \
  src/lib/__tests__/trading-calendar.test.ts src/mocks/agents/__tests__/meeting-notes.test.ts src/mocks/workspace/__tests__/meeting-notes-run.test.ts
git commit -m "feat(meetings): Meeting Notes drafts cited notes from the transcript; Adrian edits them line by line"
```

---
### Task 6: `file_meeting_record` — the binding act, the follow-up tasks, and the Archive

Filing is the meeting's binding act: advisor only, only when held, once, against the fingerprint of the notes Adrian read. It records the lines exactly as they stood, creates one task per filed follow-up (owner and due date from the line), posts the act's slip and the task list in the meeting thread, and appears in the Archive with the Johnsons as its client.

**Files:**
- Create: `src/mocks/workspace/meeting-acts.ts`
- Modify: `src/mocks/workspace/archive.ts` (`clientOf`), `src/types/workspace-supervision.ts` (`ARCHIVE_KINDS`)
- Test: `src/mocks/workspace/__tests__/meeting-filing.test.ts` (new), `src/mocks/workspace/__tests__/archive.test.ts`

**Interfaces:**
- Consumes: `visibleMeeting`, `meetingTitle`, `notesFingerprint`, `replaceMeeting`, `refuseMeeting`, `meetingEvent`, `MeetingFailure` (Tasks 3, 5); `recordAct` from `./proposal-acts`; `commitActId`, `nextAt`, `nextId`, `nextNumber`, `store`; `can`.
- Produces:

```ts
// src/mocks/workspace/meeting-acts.ts
export function fileMeetingRecord(viewerId: string, eventId: string, fingerprint: string): { ok: true; act: BindingAct } | MeetingFailure
// The act: { kind: 'file_meeting_record', actorId, at, threadId: meeting thread, subject: { type: 'meeting', id: eventId },
//            fingerprint: notesFingerprint(lines), summary: 'Filed the record of the Johnson annual review' }

// src/types/workspace-supervision.ts
// ARCHIVE_KINDS gains 'file_meeting_record' after 'sent_message'
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/meeting-filing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resetWorkspaceStore, store } from '@/mocks/data/workspace-store'
import { isTradingDay } from '@/lib/trading-calendar'
import { holdMeeting, meetingView, notesFingerprint, saveNotes } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { archiveFor } from '../archive'
import { ok } from './story-fixture'

const ADRIAN = 'user-001'
const MARK = 'cco-001'
const meeting = () => store().meetings[0]!
function readyToFile(): string {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
  return meetingView(ADRIAN, 'evt-010')!.notesFingerprint!
}
const fileActs = () => store().acts.filter((a) => a.kind === 'file_meeting_record')

describe('filing the meeting record', () => {
  it('records the act against the notes as read, keeps the lines as filed, and closes the meeting', () => {
    const fingerprint = readyToFile()
    const draft = meeting().notesDraft!
    const { act } = ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
    expect(act).toMatchObject({
      id: 'REC-0001', kind: 'file_meeting_record', actorId: ADRIAN, threadId: 'th-johnson-meeting',
      subject: { type: 'meeting', id: 'evt-010' }, fingerprint, summary: 'Filed the record of the Johnson annual review',
    })
    expect(meeting()).toMatchObject({ state: 'filed', filed: { actId: 'REC-0001', fingerprint, lines: draft } })
    expect(notesFingerprint(meeting().filed!.lines)).toBe(act.fingerprint)
    expect(meetingView(ADRIAN, 'evt-010')).toMatchObject({ state: 'filed', filedActId: 'REC-0001' })
  })

  it('creates one tracked task per follow-up, owner and due date from its line, all on trading days', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    expect(meeting().tasks.map((t) => [t.id, t.fromNoteLine, t.owner, t.due, t.state])).toEqual([
      ['task-0001', 'n-15', { kind: 'person', personId: 'user-003' }, '2026-03-02', 'open'],
      ['task-0002', 'n-16', { kind: 'person', personId: 'user-003' }, '2026-03-06', 'open'],
      ['task-0003', 'n-17', { kind: 'person', personId: 'user-001' }, '2026-02-27', 'open'],
      ['task-0004', 'n-18', { kind: 'person', personId: 'user-002' }, '2026-03-04', 'open'],
      ['task-0005', 'n-19', { kind: 'person', personId: 'user-002' }, '2026-02-26', 'open'],
      ['task-0006', 'n-20', { kind: 'person', personId: 'user-001' }, '2026-03-13', 'open'],
    ])
    for (const t of meeting().tasks) expect(isTradingDay(t.due), t.id).toBe(true)
    expect(meeting().tasks[0]!.title).toBe('Plan scenarios for the legacy goal.')
  })

  it("posts the act's slip, then the task list, in the meeting thread", () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    const thread = store().messages.filter((m) => m.threadId === 'th-johnson-meeting')
    const marker = thread.findIndex((m) => m.kind === 'act' && m.actId === 'REC-0001')
    const tasks = thread.findIndex((m) => m.kind === 'meeting_tasks')
    expect(marker).toBeGreaterThan(-1)
    expect(tasks).toBe(marker + 1)
    expect(thread[tasks]).toMatchObject({ filedActId: 'REC-0001', tasks: meeting().tasks })
  })

  it('files once: a second filing names the first and records nothing', () => {
    const fingerprint = readyToFile()
    ok(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint))
    expect(fileMeetingRecord(ADRIAN, 'evt-010', fingerprint)).toEqual({ ok: false, status: 409, code: 'ALREADY_FILED', message: 'The record was already filed (REC-0001).' })
    expect(fileActs()).toHaveLength(1)
    expect(store().messages.filter((m) => m.kind === 'meeting_tasks')).toHaveLength(1)
    expect(meeting().tasks).toHaveLength(6)
  })

  it('refuses notes that moved after they were read, and files nothing', () => {
    const read = readyToFile()
    ok(saveNotes(ADRIAN, 'evt-010', meeting().notesDraft!.map((l) => (l.id === 'n-01' ? { ...l, text: 'Reviewed the rebalance.' } : l))))
    expect(fileMeetingRecord(ADRIAN, 'evt-010', read)).toMatchObject({ status: 409, code: 'FINGERPRINT_MISMATCH' })
    expect(fileActs()).toEqual([])
    expect(meeting().state).toBe('held')
  })

  it('needs a held meeting with notes', () => {
    expect(fileMeetingRecord(ADRIAN, 'evt-010', 'X')).toMatchObject({ status: 409, code: 'NOT_HELD' })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(fileMeetingRecord(ADRIAN, 'evt-010', 'X')).toMatchObject({ status: 409, code: 'NO_NOTES' })
  })

  it('only the advisor files; a client is told the meeting does not exist', () => {
    const fingerprint = readyToFile()
    for (const viewer of ['user-002', 'user-003', MARK]) expect(fileMeetingRecord(viewer, 'evt-010', fingerprint), viewer).toMatchObject({ status: 403, code: 'NOT_PERMITTED' })
    expect(fileMeetingRecord('cli-001', 'evt-010', fingerprint)).toMatchObject({ status: 404, code: 'NO_MEETING' })
    expect(fileActs()).toEqual([])
  })

  it('a filed record cannot be edited, re-drafted or held again', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    expect(saveNotes(ADRIAN, 'evt-010', meeting().filed!.lines)).toMatchObject({ status: 409, code: 'ALREADY_FILED' })
    expect(draftMeetingNotes(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'ALREADY_FILED' })
    expect(holdMeeting(ADRIAN, 'evt-010')).toMatchObject({ status: 409, code: 'ALREADY_HELD' })
  })

  it('appears in the Archive, with the Johnsons as its client, for the firm and not for Robert', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    for (const viewer of [ADRIAN, MARK, 'user-002']) {
      const entry = archiveFor(viewer, { kind: 'file_meeting_record' })?.entries[0]
      expect(entry, viewer).toMatchObject({ kind: 'act', id: 'REC-0001', clientId: 'cli-001', clientName: 'Robert Johnson', threadId: 'th-johnson-meeting', threadTitle: 'Johnson annual review' })
    }
    expect(archiveFor('cli-001', {})).toBeUndefined()
  })

  it('reset restores the seeded meeting', () => {
    ok(fileMeetingRecord(ADRIAN, 'evt-010', readyToFile()))
    resetWorkspaceStore()
    expect(store().meetings).toEqual([{ eventId: 'evt-010', householdId: 'hh-001', threadId: 'th-johnson-meeting', state: 'scheduled', agenda: [], tasks: [] }])
    expect(store().acts).toEqual([])
  })
})
```

In `src/mocks/workspace/__tests__/archive.test.ts`, append inside its top-level `describe`:

```ts
  it('lists the meeting record kind among the kinds a filter can name', () => {
    expect(ARCHIVE_KINDS).toContain('file_meeting_record')
    expect(isArchiveKind('file_meeting_record')).toBe(true)
  })
```

adding `import { ARCHIVE_KINDS, isArchiveKind } from '@/types/workspace-supervision'` if the file does not already import them.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/meeting-filing.test.ts src/mocks/workspace/__tests__/archive.test.ts --testTimeout 30000`
Expected: FAIL — `meeting-acts` does not exist; the archive kind is missing.

- [ ] **Step 3: The act**

Create `src/mocks/workspace/meeting-acts.ts`:

```ts
import type { BindingAct } from '@/types/workspace'
import type { Meeting, MeetingTask } from '@/types/workspace-meeting'
import { can } from '@/mocks/data/people'
import { commitActId, nextAt, nextId, nextNumber, store } from '@/mocks/data/workspace-store'
import { recordAct } from './proposal-acts'
import { meetingTitle, notesFingerprint, refuseMeeting, replaceMeeting, visibleMeeting, type MeetingFailure } from './meetings'

const pad = (n: number) => String(n).padStart(4, '0')

/**
 * The meeting's binding act. Advisor only; only once the meeting is held and its notes drafted; once;
 * against the fingerprint of the notes as the advisor read them. The record keeps the lines exactly as
 * they stood, and each filed follow-up becomes a tracked task.
 */
export function fileMeetingRecord(viewerId: string, eventId: string, fingerprint: string): { ok: true; act: BindingAct } | MeetingFailure {
  const meeting = visibleMeeting(viewerId, eventId)
  if (!meeting) return refuseMeeting(404, 'NO_MEETING', 'Meeting not found.')
  if (!can(viewerId, 'file_meeting_record')) return refuseMeeting(403, 'NOT_PERMITTED', 'Only the advisor files the meeting record.')
  if (meeting.filed) return refuseMeeting(409, 'ALREADY_FILED', `The record was already filed (${meeting.filed.actId}).`)
  if (meeting.state !== 'held') return refuseMeeting(409, 'NOT_HELD', 'Hold the meeting, and draft its notes, before filing the record.')
  if (!meeting.notesDraft) return refuseMeeting(409, 'NO_NOTES', 'Ask Meeting Notes for a draft first.')
  const current = notesFingerprint(meeting.notesDraft)
  if (fingerprint !== current) return refuseMeeting(409, 'FINGERPRINT_MISMATCH', 'The notes changed since you read them. Open them again before filing.')
  const incomplete = meeting.notesDraft.find((l) => l.section === 'follow_ups' && (!l.owner || l.due === undefined))
  if (incomplete) throw new Error(`Follow-up ${incomplete.id} reached filing without an owner and a due date`)

  const lines = meeting.notesDraft.map((l) => ({ ...l, cites: [...l.cites] }))
  const act: BindingAct = {
    id: commitActId(), kind: 'file_meeting_record', actorId: viewerId, at: nextAt(), threadId: meeting.threadId,
    subject: { type: 'meeting', id: meeting.eventId }, fingerprint: current, summary: `Filed the record of the ${meetingTitle(meeting)}`,
  }
  recordAct(act)
  const tasks: MeetingTask[] = lines.flatMap((l) => (l.section === 'follow_ups' && l.owner && l.due !== undefined
    ? [{ id: `task-${pad(nextNumber('task'))}`, title: l.text, owner: l.owner, due: l.due, state: 'open' as const, fromNoteLine: l.id }]
    : []))
  const filed: Meeting = { ...meeting, state: 'filed', filed: { actId: act.id, fingerprint: current, lines }, tasks }
  replaceMeeting(filed)
  store().messages.push({ kind: 'meeting_tasks', id: nextId('msg'), threadId: meeting.threadId, at: nextAt(), eventId: meeting.eventId, filedActId: act.id, tasks })
  return { ok: true, act }
}
```

- [ ] **Step 4: The Archive**

In `src/types/workspace-supervision.ts`, `ARCHIVE_KINDS` becomes:

```ts
export const ARCHIVE_KINDS: readonly ArchiveKind[] = [
  'approve_proposal', 'withdraw_approval', 'send_to_client', 'sent_message', 'file_meeting_record',
  'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence',
]
```

In `src/mocks/workspace/archive.ts`, import `meetingEvent` from `./meetings` and add to `clientOf`, before `return thread?.clientId`:

```ts
  if (act.subject?.type === 'meeting') return meetingEvent(act.subject.id)?.clientId
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/meeting-filing.test.ts src/mocks/workspace/__tests__/archive.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green. (The Archive page's kind filter lists "File meeting record" through `ARCHIVE_KIND_LABEL`, which spreads `ACT_KIND_LABEL`; a UI test pinning the full option list is updated here.)

- [ ] **Step 7: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/mocks/workspace/meeting-acts.ts src/mocks/workspace/archive.ts src/types/workspace-supervision.ts \
  src/mocks/workspace/__tests__/meeting-filing.test.ts src/mocks/workspace/__tests__/archive.test.ts
git commit -m "feat(meetings): file_meeting_record records the notes once, creates the follow-up tasks, and reaches the Archive"
```

---
### Task 7: The recap — the Client Letter Agent drafts it from the filing; Adrian sends it

The recap is a client letter tied to the filing: the Client Letter Agent writes it from the filed record's client requests and decisions only, in Robert's client thread's drafts. It carries a `recordBasis` naming the filing; a recap whose basis no longer matches the filed record is stale and `send_to_client` refuses it. Sent, it is one message in Robert's thread, and Mark's correspondence review picks it up like any other.

**Files:**
- Create: `src/mocks/agents/meeting-recap.ts`, `src/mocks/workspace/recap.ts`, `src/mocks/workspace/draft-staleness.ts`
- Modify: `src/mocks/workspace/letters.ts` (export `draftingClientThread`; `draftsFor` and `reviseDraft` read the recap basis), `src/mocks/workspace/acts.ts` (staleness and provenance)
- Test: `src/mocks/workspace/__tests__/meeting-recap.test.ts` (new)

**Interfaces:**
- Consumes: `ClientLetter` (type) from `@/mocks/agents/client-letter`; `visibleMeeting`, `meetingEvent`, `meetingTitle` (Task 3); `fileMeetingRecord` (Task 6); `isDraftStale` from `@/mocks/data/proposals-store`; `sendToClient` from `./acts`; `supervisionQueue` from `./supervision`; `archiveFor` from `./archive`.
- Produces:

```ts
// src/mocks/agents/meeting-recap.ts
export type RecapInput = { greetingName: string; withOthers: boolean; filing: MeetingFiling; signerName: string }
export function writeMeetingRecap(input: RecapInput): ClientLetter      // figures: []
export const RECAP_HEADINGS: { client_requests: 'What you asked us'; decisions: 'What we decided' }

// src/mocks/workspace/draft-staleness.ts
export function isRecapStale(draft: Draft): boolean
export function isStale(draft: Draft): boolean          // proposal letter or recap
export function staleMessage(draft: Draft): string

// src/mocks/workspace/recap.ts
export function draftRecap(viewerId: string, clientThreadId: string, eventId: string): { ok: true; draft: Draft; created: boolean } | LetterFailure

// src/mocks/workspace/letters.ts (now exported)
export function draftingClientThread(viewerId: string, threadId: string): Thread | undefined
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/meeting-recap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'
import { JOHNSON_REVIEW_TRANSCRIPT } from '@/mocks/data/meeting-transcripts'
import { notes } from '@/mocks/data/notes'
import { holdMeeting, meetingView, saveNotes } from '../meetings'
import { draftMeetingNotes } from '../meeting-agents'
import { fileMeetingRecord } from '../meeting-acts'
import { draftRecap } from '../recap'
import { draftsFor, reviseDraft } from '../letters'
import { sendToClient } from '../acts'
import { supervisionQueue } from '../supervision'
import { archiveFor } from '../archive'
import { ok } from './story-fixture'
import type { NoteLine } from '@/types/workspace-meeting'

const ADRIAN = 'user-001'
const meeting = () => store().meetings[0]!
function heldAndDrafted() {
  ok(holdMeeting(ADRIAN, 'evt-010'))
  ok(draftMeetingNotes(ADRIAN, 'evt-010'))
}
function file() {
  ok(fileMeetingRecord(ADRIAN, 'evt-010', meetingView(ADRIAN, 'evt-010')!.notesFingerprint!))
}
const edit = (id: string, text: string): NoteLine[] => meeting().notesDraft!.map((l) => (l.id === id ? { ...l, text } : l))
const robertsTexts = () => store().messages.filter((m) => m.threadId === 'th-robert' && m.kind === 'text')

describe('the recap', () => {
  it('is drafted by the Client Letter Agent from the filed record, tied to the filing', () => {
    heldAndDrafted()
    file()
    const { draft, created } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    expect(created).toBe(true)
    expect(draft).toMatchObject({
      clientThreadId: 'th-robert', authorId: ADRIAN, agentId: 'client-letter', figures: [],
      recordBasis: { eventId: 'evt-010', actId: 'REC-0001', fingerprint: meeting().filed!.fingerprint },
    })
    expect(draft.body.startsWith('Dear Robert,\n\nThank you both for meeting with me today. Here is what we agreed.')).toBe(true)
    expect(draft.body.endsWith('If anything here is not as you remember it, please tell me.\n\nAdrian Hale')).toBe(true)
  })

  it('carries every client request and decision as filed, and nothing else', () => {
    heldAndDrafted()
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    const lines = meeting().filed!.lines
    for (const l of lines.filter((x) => x.section === 'client_requests' || x.section === 'decisions')) expect(body, l.id).toContain(l.text)
    for (const l of lines.filter((x) => x.section === 'discussion' || x.section === 'follow_ups')) expect(body, l.id).not.toContain(l.text)
    expect(body.indexOf('What you asked us:')).toBeLessThan(body.indexOf('What we decided:'))
    expect(body).toContain('asked about; comparison to follow')
    expect(body).toContain('estimate; consult your tax professional')
  })

  it('contains no transcript text, no internal note and no colleague', () => {
    heldAndDrafted()
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    for (const t of JOHNSON_REVIEW_TRANSCRIPT.filter((x) => x.text.length > 12)) expect(body, t.id).not.toContain(t.text)
    for (const n of notes.filter((x) => x.clientId === 'cli-001' || x.clientId === 'cli-002')) expect(body, n.id).not.toContain(n.content)
    expect(body).not.toMatch(/Sarah|Mike|Mitchell|Chen|task/i)
  })

  it("reads Adrian's edits, because it is written from the filed lines", () => {
    heldAndDrafted()
    ok(saveNotes(ADRIAN, 'evt-010', edit('n-09', 'We keep the legacy goal; options to protect it come to the next review.')))
    ok(saveNotes(ADRIAN, 'evt-010', edit('n-01', 'Reviewed the rebalance and the harvest in detail.')))
    file()
    const { body } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    expect(body).toContain('We keep the legacy goal; options to protect it come to the next review.')
    expect(body).not.toContain('Reviewed the rebalance and the harvest in detail.')
  })

  it('asking again returns the same draft', () => {
    heldAndDrafted()
    file()
    const first = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft
    const again = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    expect(again).toMatchObject({ created: false, draft: { id: first.id } })
    expect(store().drafts).toHaveLength(1)
  })

  it('waits for the filing; is drafted only in the client thread of a household member; never for a client viewer', () => {
    heldAndDrafted()
    expect(draftRecap(ADRIAN, 'th-robert', 'evt-010')).toMatchObject({ status: 409, code: 'NOT_FILED' })
    file()
    expect(draftRecap(ADRIAN, 'th-johnson-review', 'evt-010')).toMatchObject({ status: 400, code: 'NOT_CLIENT_THREAD' })
    expect(draftRecap(ADRIAN, 'th-robert', 'evt-999')).toMatchObject({ status: 404, code: 'NO_MEETING' })
    expect(draftRecap('user-003', 'th-robert', 'evt-010')).toMatchObject({ status: 404, code: 'NO_THREAD' })
    expect(draftRecap('cli-001', 'th-robert', 'evt-010')).toMatchObject({ status: 404, code: 'NO_THREAD' })
    expect(ok(draftRecap('user-002', 'th-robert', 'evt-010')).draft.authorId).toBe('user-002')
  })

  it("an edit keeps the recap's basis", () => {
    heldAndDrafted()
    file()
    const { draft } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    const revised = ok(reviseDraft(ADRIAN, 'th-robert', draft.id, `${draft.body}\n\nPS. See you in the spring.`)).draft
    expect(revised.recordBasis).toEqual(draft.recordBasis)
  })
})

describe('sending the recap', () => {
  it('is one new message in Robert\'s thread, recorded with the filing it came from', () => {
    heldAndDrafted()
    file()
    const before = robertsTexts().length
    const { draft } = ok(draftRecap(ADRIAN, 'th-robert', 'evt-010'))
    const { act } = ok(sendToClient(ADRIAN, draft.id))
    expect(act).toMatchObject({ kind: 'send_to_client', recordBasis: draft.recordBasis, editedBy: [] })
    expect(robertsTexts()).toHaveLength(before + 1)
    expect(robertsTexts()[before]).toMatchObject({ authorId: ADRIAN, body: draft.body })
  })

  it("reaches Mark's correspondence review and the Archive", () => {
    heldAndDrafted()
    file()
    const { act } = ok(sendToClient(ADRIAN, ok(draftRecap(ADRIAN, 'th-robert', 'evt-010')).draft.id))
    const item = supervisionQueue('cco-001')!.correspondence.find((c) => c.id === act.messageId)
    expect(item).toMatchObject({ kind: 'correspondence', clientId: 'cli-001', sendAct: { recordBasis: { actId: 'REC-0001' } } })
    expect(archiveFor('cco-001', { kind: 'sent_message' })!.entries.map((e) => e.id)).toContain(act.messageId)
  })

  it('refuses a recap whose filing it no longer matches', () => {
    heldAndDrafted()
    file()
    store().drafts.push({
      id: 'draft-9001', clientThreadId: 'th-robert', authorId: ADRIAN, body: 'Dear Robert, an older recap.', createdAt: '2026-02-25T20:30:00.000Z',
      agentId: 'client-letter', recordBasis: { eventId: 'evt-010', actId: 'REC-0001', fingerprint: 'DEADBEEF' },
    })
    expect(draftsFor('th-robert').find((d) => d.id === 'draft-9001')?.stale).toBe(true)
    expect(sendToClient(ADRIAN, 'draft-9001')).toEqual({
      ok: false, status: 409, code: 'STALE_DRAFT', message: 'This recap was drafted from REC-0001, which no longer matches the filed record. Ask for a new recap.',
    })
    expect(robertsTexts().some((m) => m.kind === 'text' && m.body === 'Dear Robert, an older recap.')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/meeting-recap.test.ts --testTimeout 30000`
Expected: FAIL — `recap` does not exist.

- [ ] **Step 3: The letter**

Create `src/mocks/agents/meeting-recap.ts`:

```ts
import type { MeetingFiling, NoteSection } from '@/types/workspace-meeting'
import type { ClientLetter } from './client-letter'

export type RecapInput = { greetingName: string; withOthers: boolean; filing: MeetingFiling; signerName: string }

export const RECAP_HEADINGS = { client_requests: 'What you asked us', decisions: 'What we decided' } as const

/**
 * The Client Letter Agent's recap of a filed meeting record: only what the clients asked and what was
 * decided, as filed — the lines say who does what in the firm's voice. No transcript text, no
 * discussion line, no follow-up task, no colleague, no figure.
 */
export function writeMeetingRecap({ greetingName, withOthers, filing, signerName }: RecapInput): ClientLetter {
  const listed = (section: Extract<NoteSection, 'client_requests' | 'decisions'>) => {
    const lines = filing.lines.filter((l) => l.section === section).map((l) => `- ${l.text}`)
    return lines.length > 0 ? [[`${RECAP_HEADINGS[section]}:`, ...lines].join('\n')] : []
  }
  const asked = listed('client_requests')
  const decided = listed('decisions')
  const paragraphs = [
    `Dear ${greetingName},`,
    `Thank you${withOthers ? ' both' : ''} for meeting with me today. Here is what we agreed.`,
    ...asked,
    ...decided,
    ...(asked.length + decided.length === 0 ? ['Nothing was decided or asked of us at this meeting.'] : []),
    'If anything here is not as you remember it, please tell me.',
    signerName,
  ]
  return { body: paragraphs.join('\n\n'), figures: [] }
}
```

- [ ] **Step 4: Staleness for both kinds of agent letter**

Create `src/mocks/workspace/draft-staleness.ts`:

```ts
import type { Draft } from '@/types/workspace'
import { isDraftStale } from '@/mocks/data/proposals-store'
import { store } from '@/mocks/data/workspace-store'

/** A recap is current only while the meeting's filing is exactly the one it was written from. */
export function isRecapStale(draft: Draft): boolean {
  const basis = draft.recordBasis
  if (!basis) return false
  const filed = store().meetings.find((m) => m.eventId === basis.eventId)?.filed
  return !filed || filed.actId !== basis.actId || filed.fingerprint !== basis.fingerprint
}

/** Whether an agent letter's basis — an approved version, or a filed record — no longer holds. */
export const isStale = (draft: Draft): boolean => isDraftStale(draft) || isRecapStale(draft)

export function staleMessage(draft: Draft): string {
  return draft.recordBasis
    ? `This recap was drafted from ${draft.recordBasis.actId}, which no longer matches the filed record. Ask for a new recap.`
    : `This letter was drafted from v${draft.basis?.version ?? 0}, which is no longer the approved version. Ask for a new letter.`
}
```

In `src/mocks/workspace/acts.ts`:

- replace `import { isDraftStale } from '@/mocks/data/proposals-store'` with `import { isStale, staleMessage } from './draft-staleness'`;
- the stale check becomes `if (isStale(draft)) return { ok: false, status: 409, code: 'STALE_DRAFT', message: staleMessage(draft) }`;
- the provenance spread on the act becomes:

```ts
    // Books and records: an agent's letter records what it came from (an approved version or a filed record) and every person who edited it.
    ...(draft.agentId ? {
      ...(draft.basis ? { basis: draft.basis } : {}),
      ...(draft.recordBasis ? { recordBasis: draft.recordBasis } : {}),
      editedBy: draft.editorIds ?? [],
    } : {}),
```

In `src/mocks/workspace/letters.ts`:

- `function draftingClientThread` becomes `export function draftingClientThread`;
- `import { activeApproval, isDraftStale } from '@/mocks/data/proposals-store'` keeps `isDraftStale` (the proposal letter's own check) and add `import { isStale } from './draft-staleness'`;
- `draftsFor` returns `store().drafts.filter((d) => d.clientThreadId === clientThreadId).map((d) => ({ ...d, stale: isStale(d) }))`;
- in `reviseDraft`, the new draft keeps the recap basis too — add `...(old.recordBasis ? { recordBasis: old.recordBasis } : {}),` after `basis: old.basis,`, and its comment reads `// The edit keeps the letter's basis (so it still goes stale with the approval or the filing) but not its figures: the text is now the editor's.`

- [ ] **Step 5: The recap in the drafts**

Create `src/mocks/workspace/recap.ts`:

```ts
import type { Draft } from '@/types/workspace'
import { clients } from '@/mocks/data/clients'
import { personById } from '@/mocks/data/people'
import { nextAt, nextId, store } from '@/mocks/data/workspace-store'
import { writeMeetingRecap } from '@/mocks/agents/meeting-recap'
import { firstNameOf } from '@/lib/words'
import { draftingClientThread, type LetterFailure } from './letters'
import { isRecapStale } from './draft-staleness'
import { meetingEvent, meetingTitle, visibleMeeting } from './meetings'

const refuse = (status: LetterFailure['status'], code: string, message: string): LetterFailure => ({ ok: false, status, code, message })

/** The Client Letter Agent's recap of a filed meeting, drafted in the client thread of a member of the meeting's household. */
export function draftRecap(viewerId: string, clientThreadId: string, eventId: string): { ok: true; draft: Draft; created: boolean } | LetterFailure {
  const thread = draftingClientThread(viewerId, clientThreadId)
  if (!thread) return refuse(404, 'NO_THREAD', 'Thread not found.')
  if (thread.visibility !== 'client' || thread.clientId === undefined) return refuse(400, 'NOT_CLIENT_THREAD', 'A recap is drafted in a client thread.')
  const meeting = visibleMeeting(viewerId, eventId)
  const event = meeting && meetingEvent(meeting.eventId)
  if (!meeting || !event) return refuse(404, 'NO_MEETING', 'Meeting not found.')
  const client = clients.find((c) => c.id === thread.clientId)
  if (!client || client.householdId !== meeting.householdId) return refuse(400, 'NOT_THIS_CLIENT', "That meeting is not with this thread's client.")
  if (!meeting.filed) return refuse(409, 'NOT_FILED', `File the record of the ${meetingTitle(meeting)} before asking for its recap.`)

  const recordBasis = { eventId: meeting.eventId, actId: meeting.filed.actId, fingerprint: meeting.filed.fingerprint }
  const s = store()
  const existing = s.drafts.find((d) => d.clientThreadId === thread.id && d.agentId === 'client-letter'
    && d.recordBasis?.actId === recordBasis.actId && !isRecapStale(d))
  if (existing) return { ok: true, draft: existing, created: false }
  const filedBy = s.acts.find((a) => a.id === recordBasis.actId)?.actorId
  const signer = filedBy === undefined ? undefined : personById(filedBy)
  if (!signer) throw new Error(`The filing ${recordBasis.actId} names no recorded actor`)
  const withOthers = event.attendees.some((a) => a.id !== client.id && clients.some((c) => c.id === a.id))
  const letter = writeMeetingRecap({ greetingName: firstNameOf(client.fullName), withOthers, filing: meeting.filed, signerName: signer.name })
  const draft: Draft = {
    id: nextId('draft'), clientThreadId: thread.id, authorId: viewerId, body: letter.body, createdAt: nextAt(),
    agentId: 'client-letter', recordBasis, figures: letter.figures,
  }
  s.drafts.push(draft)
  return { ok: true, draft, created: true }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/meeting-recap.test.ts src/mocks/workspace/__tests__/letters.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green. (A proposal letter's send act no longer carries `basis: undefined` when the draft had none; tests compare with `toMatchObject`/`toEqual`, which treat a missing key and an undefined one alike.)

- [ ] **Step 8: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/mocks/agents/meeting-recap.ts src/mocks/workspace/recap.ts src/mocks/workspace/draft-staleness.ts \
  src/mocks/workspace/letters.ts src/mocks/workspace/acts.ts src/mocks/workspace/__tests__/meeting-recap.test.ts
git commit -m "feat(meetings): the Client Letter Agent drafts the recap from the filing; a stale recap cannot be sent"
```

---
### Task 8: The household and client read models

The full views' dense reference, read from the engine: each managed account's value (from its positions, so the moved book after fills), its model and its drift against the band with any structural residual, the held-away accounts outside the firm's view, the plan's goals with probability and funded status, the taxpayer's open wash-sale windows, the IPS and its signature state, open items, and — for the household view — documents, communications, activity and meetings past and upcoming. The client view adds the profile and risk assessment. Firm viewers only.

**Files:**
- Create: `src/types/workspace-household.ts`, `src/mocks/workspace/household-views.ts`
- Test: `src/mocks/workspace/__tests__/household-views.test.ts` (new)

**Interfaces:**
- Consumes: `accounts`, `householdFixtures`, `heldAwayAssets`, `plans`, `documents`, `clientComms`, `activities`, `clients`, `calendarEvents`, `OPEN_ITEMS` (Task 4); `getPositionsForAccount`; `openWashSaleWindows`; `computeDriftForAccount`, `modelDisplayName` from `@/mocks/handlers/pms`; `projectDrift` from `@/mocks/handlers/oms`; `ACCOUNT_TYPE_LABELS`, `capitalize` from `@/lib/labels`; `meetingOf`, `meetingTitle` (Task 3); `sessionNow`; `personById`; `MOCK_TODAY_ISO`.
- Produces:

```ts
// src/types/workspace-household.ts — the full file is in Step 3:
// StructuralResidual, OutOfBand, HouseholdAccount, HeldAwayHolding, PlanGoal, TaxpayerWindow, IpsOnFile, HouseholdOpenItem,
// HouseholdMember, HouseholdSummary, DocumentRow, CommunicationRow, ActivityRow, MeetingRef, HouseholdView, ClientView

// src/mocks/workspace/household-views.ts
export function householdView(viewerId: string, householdId: string): HouseholdView | undefined
export function clientView(viewerId: string, clientId: string): ClientView | undefined
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/workspace/__tests__/household-views.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { clientView, householdView } from '../household-views'
import { holdMeeting } from '../meetings'
import { approvedV1, ok, release } from './story-fixture'

const ADRIAN = 'user-001'
const johnson = () => {
  const view = householdView(ADRIAN, 'hh-001')
  if (!view) throw new Error('the Johnson household view is readable by the advisor')
  return view
}
const valueOf = (id: string) => {
  const a = accounts.find((x) => x.id === id)!
  return getPositionsForAccount(a.id, a.totalValue).reduce((s, p) => s + p.marketValue, 0)
}

describe('the household view', () => {
  it('names the household and its members', () => {
    expect(johnson()).toMatchObject({ id: 'hh-001', name: 'Johnson Household', shortName: 'Johnson' })
    expect(johnson().members).toEqual([
      { clientId: 'cli-001', name: 'Robert Johnson', relationship: 'primary', dateOfBirth: '1958-03-22' },
      { clientId: 'cli-002', name: 'Patricia Johnson', relationship: 'spouse', dateOfBirth: '1960-07-11' },
    ])
  })

  it('lists all five managed accounts, each valued from its positions, against its model', () => {
    const rows = johnson().accounts
    expect(rows.map((r) => r.accountId)).toEqual(['acc-001', 'acc-002', 'acc-003', 'acc-004', 'acc-005'])
    for (const row of rows) {
      const account = accounts.find((a) => a.id === row.accountId)!
      const drift = computeDriftForAccount(account)
      expect(row.value, row.accountId).toBe(valueOf(row.accountId))
      expect(row.modelName).toBe(modelDisplayName(drift.modelId))
      expect(row.withinBand).toBe(!drift.needsRebalance)
      expect(row.maxAbsDrift).toBe(drift.maxAbsDrift)
      expect(row.outside.map((o) => o.assetClass)).toEqual(drift.assetClassDrifts.filter((d) => Math.abs(d.drift) > drift.driftTolerance).map((d) => d.assetClass))
      for (const o of row.outside) expect([undefined, 'not_market_tradable', 'replacement_hold']).toContain(o.residual)
    }
    expect(rows[1]).toMatchObject({ name: 'Robert Johnson Individual', ownerName: 'Robert Johnson', typeLabel: 'Individual' })
    expect(Math.abs(johnson().managedValue - 18_750_000)).toBeLessThanOrEqual(5)
    expect(johnson().managedValue).toBe(rows.reduce((s, r) => s + r.value, 0))
  })

  it('flags the held-away plans, outside the firm\'s view', () => {
    expect(johnson().heldAway).toEqual([
      { id: 'ha-001', ownerName: 'Robert Johnson', institution: 'Vanguard', accountType: '401(k) — Former employer', value: 2_400_000, reportedOn: '2025-12-01' },
      { id: 'ha-002', ownerName: 'Patricia Johnson', institution: 'TIAA', accountType: '403(b) — University', value: 1_500_000, reportedOn: '2025-11-15' },
    ])
    expect(johnson().heldAwayValue).toBe(3_900_000)
  })

  it("states the plan's goals with probability and funded status", () => {
    expect(johnson().planProbability).toBe(0.87)
    expect(johnson().goals).toContainEqual({ id: 'goal-002', name: 'Legacy / Estate', probability: 0.78, funded: 0.85, status: 'at_risk' })
  })

  it("lists the taxpayer's open wash-sale windows, and the one the morning's fills open", () => {
    expect(johnson().windows).toEqual([{ saleId: 'rs-001', accountName: 'Robert Johnson Individual', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-20', through: '2026-03-22', loss: -32_750 }])
    release(approvedV1())
    expect(johnson().windows.map((w) => [w.saleId, w.through])).toEqual([['rs-001', '2026-03-22'], ['rs-006', '2026-03-27']])
    expect(johnson().accounts[1]!.value).toBe(valueOf('acc-002'))
  })

  it('states the IPS and its signature, and the open items', () => {
    expect(johnson().ips).toEqual({ documentId: 'doc-001', name: 'Johnson Family Trust — IPS', signatureStatus: 'signed', signedOn: '2025-11-15' })
    expect(johnson().openItems.map((i) => i.id)).toEqual(['oi-001', 'doc-003'])
    expect(johnson().openItems[1]).toEqual({ id: 'doc-003', text: 'Awaiting signature: Tax Loss Harvesting Proposal', source: 'doc-003' })
  })

  it('carries documents, communications and activity, latest first, none after the session clock', () => {
    const view = johnson()
    expect(view.documents.map((d) => d.id)).toEqual(['doc-003', 'doc-002', 'doc-001', 'doc-004'])
    expect(view.communications.every((c) => Date.parse(c.at) <= Date.parse(MOCK_NOW_ISO))).toBe(true)
    expect(view.communications.map((c) => c.at)).toEqual([...view.communications.map((c) => c.at)].sort().reverse())
    expect(view.communications.find((c) => c.id === 'comm-014')?.summary).toContain('Vanguard 401(k)')
    expect(view.activity.map((a) => a.id)).toEqual(expect.arrayContaining(['act-005', 'act-011']))
  })

  it('lists the annual review as upcoming, then past once it is held', () => {
    expect(johnson().meetings).toEqual({
      past: [],
      upcoming: [{ eventId: 'evt-010', title: 'Johnson annual review', start: '2026-02-25T19:00:00.000Z', end: '2026-02-25T20:15:00.000Z', state: 'scheduled', threadId: 'th-johnson-meeting' }],
    })
    ok(holdMeeting(ADRIAN, 'evt-010'))
    expect(johnson().meetings.past.map((m) => [m.eventId, m.state])).toEqual([['evt-010', 'held']])
    expect(johnson().meetings.upcoming).toEqual([])
  })

  it('is firm only: a client, a stranger and an unknown household get nothing', () => {
    for (const viewer of ['user-002', 'user-003', 'cco-001']) expect(householdView(viewer, 'hh-001'), viewer).toBeDefined()
    expect(householdView('cli-001', 'hh-001')).toBeUndefined()
    expect(householdView('nobody', 'hh-001')).toBeUndefined()
    expect(householdView(ADRIAN, 'hh-999')).toBeUndefined()
  })
})

describe('the client view', () => {
  it("states Patricia's profile, risk assessment and its date, her accounts, the household IPS and her communications", () => {
    const view = clientView(ADRIAN, 'cli-002')!
    expect(view).toMatchObject({
      id: 'cli-002', name: 'Patricia Johnson', householdId: 'hh-001', householdName: 'Johnson Household', dateOfBirth: '1960-07-11', occupation: 'Retired',
      preferredContact: 'phone', risk: { tolerance: 'Conservative', scoreFraction: 0.35, assessedOn: '2025-09-15' },
    })
    expect(view.accounts.map((a) => a.accountId)).toEqual(['acc-004', 'acc-005'])
    expect(view.accountsValue).toBe(view.accounts.reduce((s, a) => s + a.value, 0))
    expect(view.ips?.documentId).toBe('doc-001')
    expect(view.communications.every((c) => c.clientName === 'Patricia Johnson')).toBe(true)
  })

  it('is firm only', () => {
    expect(clientView('cli-001', 'cli-001')).toBeUndefined()
    expect(clientView(ADRIAN, 'cli-999')).toBeUndefined()
    expect(clientView('cco-001', 'cli-001')?.name).toBe('Robert Johnson')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-views.test.ts --testTimeout 30000`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: The types**

Create `src/types/workspace-household.ts`:

```ts
import type { AssetClass } from './portfolio'
import type { GoalStatus } from './planning'
import type { DocumentType, SignatureStatus } from './document'
import type { CommChannel, CommDirection } from './client-comms'
import type { HouseholdRelationship } from './household'
import type { MeetingState } from './workspace-meeting'

/** A reason the engine can state, without a proposal, that an out-of-band class cannot be closed by selling. */
export type StructuralResidual = 'not_market_tradable' | 'replacement_hold'
export type OutOfBand = { assetClass: AssetClass; drift: number; residual?: StructuralResidual }

export type HouseholdAccount = {
  accountId: string; name: string; ownerId: string; ownerName: string; typeLabel: string
  /** The sum of the account's positions as the book stands (moved by the session's fills). */
  value: number
  modelName: string; driftTolerance: number; maxAbsDrift: number; withinBand: boolean
  outside: OutOfBand[]
}
/** An account the firm does not manage: its value as last reported, outside the firm's view. */
export type HeldAwayHolding = { id: string; ownerName: string; institution: string; accountType: string; value: number; reportedOn: string }
/** `funded` is current funding over the target, a fraction. */
export type PlanGoal = { id: string; name: string; probability: number; funded: number; status: GoalStatus }
export type TaxpayerWindow = { saleId: string; accountName: string; symbol: string; name: string; saleDate: string; through: string; loss: number }
export type IpsOnFile = { documentId: string; name: string; signatureStatus: SignatureStatus; signedOn?: string }
export type HouseholdOpenItem = { id: string; text: string; source: string }
export type HouseholdMember = { clientId: string; name: string; relationship: HouseholdRelationship; dateOfBirth: string }

export type HouseholdSummary = {
  id: string; name: string
  /** "Johnson", for labels such as "Household · Johnson". */
  shortName: string
  members: HouseholdMember[]
  accounts: HouseholdAccount[]
  managedValue: number
  heldAway: HeldAwayHolding[]
  heldAwayValue: number
  goals: PlanGoal[]
  planProbability?: number
  windows: TaxpayerWindow[]
  ips?: IpsOnFile
  openItems: HouseholdOpenItem[]
  /** The session clock when this was read. */
  asOf: string
}

export type DocumentRow = { id: string; name: string; type: DocumentType; clientName: string; signatureStatus: SignatureStatus; updatedOn: string }
export type CommunicationRow = { id: string; clientName: string; channel: CommChannel; direction: CommDirection; subject: string; summary: string; at: string }
export type ActivityRow = { id: string; title: string; description: string; at: string }
/** A meeting on the household's calendar: one the workspace runs carries its state and thread; any other is a calendar entry. */
export type MeetingRef = { eventId: string; title: string; start: string; end: string; state: MeetingState | 'calendar'; threadId?: string }

export type HouseholdView = HouseholdSummary & {
  documents: DocumentRow[]
  communications: CommunicationRow[]
  activity: ActivityRow[]
  meetings: { past: MeetingRef[]; upcoming: MeetingRef[] }
}

export type ClientView = {
  id: string; name: string; householdId: string; householdName: string; dateOfBirth: string; occupation: string
  preferredContact?: string
  /** The risk score as a fraction of the 100-point scale. */
  risk: { tolerance: string; scoreFraction: number; assessedOn: string }
  accounts: HouseholdAccount[]
  /** The sum of the client's own accounts' values. */
  accountsValue: number
  ips?: IpsOnFile
  communications: CommunicationRow[]
}
```

- [ ] **Step 4: The read models**

Create `src/mocks/workspace/household-views.ts`:

```ts
import type { Account } from '@/types/account'
import type { HouseholdFixture } from '@/types/household'
import type {
  ClientView, CommunicationRow, HouseholdAccount, HouseholdSummary, HouseholdView, IpsOnFile, MeetingRef, OutOfBand, StructuralResidual,
} from '@/types/workspace-household'
import { accounts } from '@/mocks/data/accounts'
import { householdFixtures } from '@/mocks/data/households'
import { heldAwayAssets } from '@/mocks/data/held-away'
import { plans } from '@/mocks/data/planning'
import { documents } from '@/mocks/data/documents'
import { clientComms } from '@/mocks/data/client-comms'
import { activities } from '@/mocks/data/activities'
import { clients } from '@/mocks/data/clients'
import { calendarEvents } from '@/mocks/data/calendar'
import { OPEN_ITEMS } from '@/mocks/data/open-items'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import { personById } from '@/mocks/data/people'
import { sessionNow } from '@/mocks/data/workspace-store'
import { computeDriftForAccount, modelDisplayName } from '@/mocks/handlers/pms'
import { projectDrift } from '@/mocks/handlers/oms'
import { ACCOUNT_TYPE_LABELS, capitalize } from '@/lib/labels'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { meetingOf, meetingTitle } from './meetings'

const STRUCTURAL: ReadonlySet<string> = new Set<StructuralResidual>(['not_market_tradable', 'replacement_hold'])
const isStructural = (reason: string | undefined): reason is StructuralResidual => reason !== undefined && STRUCTURAL.has(reason)
const latestFirst = <T>(at: (x: T) => string) => (a: T, b: T) => Date.parse(at(b)) - Date.parse(at(a))
const isFirmViewer = (viewerId: string) => {
  const viewer = personById(viewerId)
  return viewer !== undefined && viewer.role !== 'client'
}

function clientName(clientId: string): string {
  const client = clients.find((c) => c.id === clientId)
  if (!client) throw new Error(`No client "${clientId}"`)
  return client.fullName
}

/** An account against its model: drift from the drift engine, and for an out-of-band class, the structural reason it cannot be sold back in. */
function accountRow(account: Account): HouseholdAccount {
  const drift = computeDriftForAccount(account)
  const residuals = new Map(projectDrift(account.id, [], true, drift.driftTolerance).assetClassDrifts.map((d) => [d.assetClass, d.residualReason]))
  const outside: OutOfBand[] = drift.assetClassDrifts.filter((d) => Math.abs(d.drift) > drift.driftTolerance).map((d) => {
    const reason = residuals.get(d.assetClass)
    return { assetClass: d.assetClass, drift: d.drift, ...(isStructural(reason) ? { residual: reason } : {}) }
  })
  return {
    accountId: account.id, name: account.name, ownerId: account.clientId, ownerName: clientName(account.clientId), typeLabel: ACCOUNT_TYPE_LABELS[account.type],
    value: getPositionsForAccount(account.id, account.totalValue).reduce((s, p) => s + p.marketValue, 0),
    modelName: modelDisplayName(drift.modelId), driftTolerance: drift.driftTolerance, maxAbsDrift: drift.maxAbsDrift, withinBand: !drift.needsRebalance, outside,
  }
}

function ipsOf(memberIds: ReadonlySet<string>): IpsOnFile | undefined {
  const ips = documents.filter((d) => d.type === 'ips' && memberIds.has(d.clientId)).sort(latestFirst((d) => d.updatedAt))[0]
  return ips && { documentId: ips.id, name: ips.name, signatureStatus: ips.signatureStatus, ...(ips.signatureStatus === 'signed' ? { signedOn: ips.updatedAt.slice(0, 10) } : {}) }
}

function communicationsOf(memberIds: ReadonlySet<string>): CommunicationRow[] {
  return clientComms.filter((c) => memberIds.has(c.clientId)).sort(latestFirst((c) => c.timestamp))
    .map((c) => ({ id: c.id, clientName: c.clientName, channel: c.channel, direction: c.direction, subject: c.subject, summary: c.summary, at: c.timestamp }))
}

function summaryOf(household: HouseholdFixture): HouseholdSummary {
  const memberIds = new Set(household.members.map((m) => m.clientId))
  const own = accounts.filter((a) => a.householdId === household.id).map(accountRow)
  const heldAway = heldAwayAssets.filter((h) => h.householdId === household.id).map((h) => ({
    id: h.id, ownerName: clientName(h.clientId), institution: h.institutionName, accountType: h.accountType, value: h.estimatedValue, reportedOn: h.lastUpdated,
  }))
  const plan = plans.find((p) => p.householdId === household.id)
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id
  const pending = documents.filter((d) => memberIds.has(d.clientId) && d.signatureStatus === 'pending')
  const ips = ipsOf(memberIds)
  return {
    id: household.id, name: household.name, shortName: household.name.replace(/ Household$/, ''),
    members: household.members.map((m) => ({ clientId: m.clientId, name: m.name, relationship: m.relationship, dateOfBirth: m.dateOfBirth })),
    accounts: own, managedValue: own.reduce((s, a) => s + a.value, 0),
    heldAway, heldAwayValue: heldAway.reduce((s, h) => s + h.value, 0),
    goals: (plan?.goals ?? []).map((g) => ({ id: g.id, name: g.name, probability: g.probability, funded: g.currentFunding / g.targetAmount, status: g.status })),
    ...(plan ? { planProbability: plan.aggregateProbability } : {}),
    windows: openWashSaleWindows(MOCK_TODAY_ISO, household.id).map((w) => ({
      saleId: w.id, accountName: accountName(w.accountId), symbol: w.symbol, name: w.name, saleDate: w.saleDate, through: w.end, loss: w.realisedGainLoss,
    })),
    ...(ips ? { ips } : {}),
    openItems: [
      ...OPEN_ITEMS.filter((i) => i.householdId === household.id).map((i) => ({ id: i.id, text: i.text, source: i.source })),
      ...pending.map((d) => ({ id: d.id, text: `Awaiting signature: ${d.name}`, source: d.id })),
    ],
    asOf: sessionNow(),
  }
}

function meetingsOf(householdId: string): HouseholdView['meetings'] {
  const now = Date.parse(sessionNow())
  const refs = calendarEvents.filter((e) => e.householdId === householdId).map((e): { ref: MeetingRef; past: boolean } => {
    const meeting = meetingOf(e.id)
    const start = new Date(e.startTime).toISOString()
    const end = new Date(e.endTime).toISOString()
    return meeting
      ? { ref: { eventId: e.id, title: meetingTitle(meeting), start, end, state: meeting.state, threadId: meeting.threadId }, past: meeting.state !== 'scheduled' }
      : { ref: { eventId: e.id, title: e.title, start, end, state: 'calendar' }, past: Date.parse(end) <= now }
  }).sort((a, b) => Date.parse(a.ref.start) - Date.parse(b.ref.start))
  return { past: refs.filter((r) => r.past).map((r) => r.ref), upcoming: refs.filter((r) => !r.past).map((r) => r.ref) }
}

/** The household as a firm viewer reads it. A client, or anyone unknown, gets nothing. */
export function householdView(viewerId: string, householdId: string): HouseholdView | undefined {
  const household = householdFixtures.find((h) => h.id === householdId)
  if (!household || !isFirmViewer(viewerId)) return undefined
  const memberIds = new Set(household.members.map((m) => m.clientId))
  return {
    ...summaryOf(household),
    documents: documents.filter((d) => memberIds.has(d.clientId)).sort(latestFirst((d) => d.updatedAt)).map((d) => ({
      id: d.id, name: d.name, type: d.type, clientName: clientName(d.clientId), signatureStatus: d.signatureStatus, updatedOn: d.updatedAt.slice(0, 10),
    })),
    communications: communicationsOf(memberIds),
    activity: activities.filter((a) => a.entityId === household.id || (a.entityId !== undefined && memberIds.has(a.entityId)))
      .sort(latestFirst((a) => a.timestamp)).map((a) => ({ id: a.id, title: a.title, description: a.description, at: a.timestamp })),
    meetings: meetingsOf(household.id),
  }
}

/** One client as a firm viewer reads them: profile, risk assessment, the accounts they own, the household's IPS, their communications. */
export function clientView(viewerId: string, clientId: string): ClientView | undefined {
  const client = clients.find((c) => c.id === clientId)
  const household = client && householdFixtures.find((h) => h.id === client.householdId)
  if (!client || !household || !isFirmViewer(viewerId)) return undefined
  const ips = ipsOf(new Set(household.members.map((m) => m.clientId)))
  const owned = accounts.filter((a) => a.clientId === client.id).map(accountRow)
  return {
    id: client.id, name: client.fullName, householdId: household.id, householdName: household.name, dateOfBirth: client.dateOfBirth, occupation: client.occupation,
    ...(client.contactInfo.preferredContactMethod ? { preferredContact: client.contactInfo.preferredContactMethod } : {}),
    risk: { tolerance: capitalize(client.riskProfile.tolerance), scoreFraction: client.riskProfile.score / 100, assessedOn: client.riskProfile.lastAssessed },
    accounts: owned,
    accountsValue: owned.reduce((s, a) => s + a.value, 0),
    ...(ips ? { ips } : {}),
    communications: communicationsOf(new Set([client.id])),
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/workspace/__tests__/household-views.test.ts --testTimeout 30000`
Expected: PASS. If the document order differs because two documents share an `updatedAt`, the engine's order is the fixtures' order within a tie (the sort is stable); correct the test's expectation to it and say so in the task report.

- [ ] **Step 6: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 7: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/types/workspace-household.ts src/mocks/workspace/household-views.ts src/mocks/workspace/__tests__/household-views.test.ts
git commit -m "feat(meetings): household and client read models from the engine, firm only"
```

---
### Task 9: The endpoints, the client functions and the hooks

Every meeting, household, client and recap surface over HTTP, viewer-filtered: a client viewer gets `404` from each before anything about the request is read; no viewer is `401`; a malformed body is `400` only for a viewer who may see the meeting. `file_meeting_record` joins `POST /api/workspace/acts`. A client's view of a sent recap carries no firm provenance.

**Files:**
- Create: `src/mocks/handlers/workspace-meetings.ts`, `src/hooks/use-meetings.ts`
- Modify: `src/mocks/handlers/workspace.ts` (acts case, `withoutProvenance`, handler registration), `src/services/api-client.ts` (`put` headers), `src/services/workspace.ts`, `src/hooks/use-workspace.ts` (export `useInvalidateWorkspace`)
- Test: `src/mocks/handlers/__tests__/workspace-meetings-api.test.ts` (new), `src/hooks/__tests__/use-meetings.test.tsx` (new)

**Interfaces:**
- Consumes: Tasks 3–8's engine functions; `firmViewer`, `readJson`, `refusal`, `badRequest`, `nonEmptyString` from `./workspace-http`; `isNoteSection`.
- Produces:

```ts
// src/mocks/handlers/workspace-meetings.ts
export function parseAgendaItems(value: unknown): { ok: true; items: AgendaItemInput[] } | { ok: false; message: string }
export function parseNoteLines(value: unknown): { ok: true; lines: NoteLineInput[] } | { ok: false; message: string }
export const workspaceMeetingHandlers: HttpHandler[]
//   GET  /api/workspace/meetings                         → MeetingSummary[]
//   GET  /api/workspace/meetings/:eventId                → MeetingView
//   POST /api/workspace/meetings/:eventId/prep           → MeetingView (201 created, 200 repeat)
//   POST /api/workspace/meetings/:eventId/agenda {items} → MeetingView (201)
//   POST /api/workspace/meetings/:eventId/hold           → MeetingView (200)
//   POST /api/workspace/meetings/:eventId/notes/draft    → MeetingView (201 created, 200 repeat)
//   PUT  /api/workspace/meetings/:eventId/notes {lines}  → MeetingView (200)
//   GET  /api/workspace/households/:householdId          → HouseholdView
//   GET  /api/workspace/clients/:clientId                → ClientView
//   POST /api/workspace/threads/:id/drafts/recap {eventId} → Draft (201 created, 200 repeat)
// POST /api/workspace/acts { kind: 'file_meeting_record', eventId, fingerprint } → BindingAct (201)

// src/services/api-client.ts
export function put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T>

// src/services/workspace.ts (added)
export const getMeetings: (viewer: string) => Promise<MeetingSummary[]>
export const getMeeting: (viewer: string, eventId: string) => Promise<MeetingView>
export const runMeetingPrep: (viewer: string, eventId: string) => Promise<MeetingView>
export const reviseAgenda: (viewer: string, eventId: string, items: AgendaItemInput[]) => Promise<MeetingView>
export const holdMeeting: (viewer: string, eventId: string) => Promise<MeetingView>
export const draftMeetingNotes: (viewer: string, eventId: string) => Promise<MeetingView>
export const saveMeetingNotes: (viewer: string, eventId: string, lines: NoteLineInput[]) => Promise<MeetingView>
export const fileMeetingRecord: (viewer: string, eventId: string, fingerprint: string) => Promise<BindingAct>
export const draftRecap: (viewer: string, clientThreadId: string, eventId: string) => Promise<Draft>
export const getHousehold: (viewer: string, householdId: string) => Promise<HouseholdView>
export const getClientView: (viewer: string, clientId: string) => Promise<ClientView>

// src/hooks/use-meetings.ts
export function useMeetings(enabled?: boolean)                 // ['workspace', viewer, 'meetings']
export function useMeeting(eventId: string)                    // ['workspace', viewer, 'meeting', eventId]
export function useHousehold(householdId: string, enabled?: boolean)   // ['workspace', viewer, 'household', householdId]
export function useClientView(clientId: string, enabled?: boolean)     // ['workspace', viewer, 'client', clientId]
export function useRunMeetingPrep(eventId: string)             // mutate()
export function useReviseAgenda(eventId: string)               // mutate(items: AgendaItemInput[])
export function useHoldMeeting(eventId: string)                // mutate()
export function useDraftMeetingNotes(eventId: string)          // mutate()
export function useSaveMeetingNotes(eventId: string)           // mutate(lines: NoteLineInput[])
export function useFileMeetingRecord(eventId: string)          // mutate(fingerprint: string) → BindingAct
export function useDraftRecap(clientThreadId: string)          // mutate(eventId: string) → Draft
// Every mutation invalidates the workspace prefix on settle, so a refusal refreshes what is on screen too.

// src/hooks/use-workspace.ts
export function useInvalidateWorkspace(): () => Promise<void>
```

- [ ] **Step 1: Write the failing tests**

Create `src/mocks/handlers/__tests__/workspace-meetings-api.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { store } from '@/mocks/data/workspace-store'

async function call(method: string, path: string, viewer: string | undefined, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (viewer) headers['X-Viewer'] = viewer
  const res = await fetch(`/api/workspace${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const ADRIAN = 'user-001'
const ROBERT = 'cli-001'
async function filed() {
  await call('POST', '/meetings/evt-010/hold', ADRIAN)
  const { body: view } = await call('POST', '/meetings/evt-010/notes/draft', ADRIAN)
  const { body: act } = await call('POST', '/acts', ADRIAN, { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: view.notesFingerprint })
  return { view, act }
}

describe('meeting endpoints', () => {
  it('firm viewers list and read the meeting; the transcript arrives only once it is held', async () => {
    expect((await call('GET', '/meetings', 'cco-001')).body).toEqual([expect.objectContaining({ eventId: 'evt-010', title: 'Johnson annual review', state: 'scheduled' })])
    const scheduled = await call('GET', '/meetings/evt-010', 'user-002')
    expect(scheduled.status).toBe(200)
    expect(scheduled.body.transcript).toBeUndefined()
    expect((await call('POST', '/meetings/evt-010/hold', ADRIAN)).status).toBe(200)
    expect((await call('GET', '/meetings/evt-010', 'user-003')).body.transcript).toHaveLength(25)
    expect((await call('GET', '/meetings/evt-999', ADRIAN)).status).toBe(404)
  })

  it('prep posts findings and agenda v1 once; a repeat is 200; the agenda takes a new version', async () => {
    const first = await call('POST', '/meetings/evt-010/prep', ADRIAN)
    expect(first.status).toBe(201)
    expect(first.body.agenda).toHaveLength(1)
    expect((await call('POST', '/meetings/evt-010/prep', ADRIAN)).status).toBe(200)
    const items = [...first.body.agenda[0].items, { title: 'ESG alternatives for the trust', source: { kind: 'advisor' } }]
    const revised = await call('POST', '/meetings/evt-010/agenda', ADRIAN, { items })
    expect(revised.status).toBe(201)
    expect(revised.body.agenda).toHaveLength(2)
    expect((await call('POST', '/meetings/evt-010/agenda', ADRIAN, { items: [{ title: 'x' }] }))).toMatchObject({ status: 400, body: { code: 'BAD_REQUEST' } })
    expect((await call('POST', '/meetings/evt-010/agenda', ADRIAN, { items: 'everything' })).status).toBe(400)
  })

  it('notes: drafted after the hold, edited with PUT, refused line by line', async () => {
    expect((await call('POST', '/meetings/evt-010/notes/draft', ADRIAN))).toMatchObject({ status: 409, body: { code: 'NOT_HELD' } })
    await call('POST', '/meetings/evt-010/hold', ADRIAN)
    const drafted = await call('POST', '/meetings/evt-010/notes/draft', ADRIAN)
    expect(drafted.status).toBe(201)
    const lines = drafted.body.notesDraft.map((l: { id: string; text: string }) => (l.id === 'n-01' ? { ...l, text: 'Reviewed the rebalance.' } : l))
    const saved = await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines })
    expect(saved.status).toBe(200)
    expect(saved.body.notesDraft[0].text).toBe('Reviewed the rebalance.')
    expect(saved.body.notesFingerprint).not.toBe(drafted.body.notesFingerprint)
    const uncited = lines.map((l: { id: string }) => (l.id === 'n-01' ? { ...l, cites: ['t-99'] } : l))
    expect((await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines: uncited }))).toMatchObject({ status: 400, body: { code: 'UNKNOWN_CITATION' } })
    expect((await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines: [{ section: 'minutes', text: 'x', cites: ['t-01'] }] }))).toMatchObject({ status: 400, body: { code: 'BAD_REQUEST' } })
    expect((await call('PUT', '/meetings/evt-010/notes', 'user-002', { lines }))).toMatchObject({ status: 403, body: { code: 'NOT_PERMITTED' } })
  })

  it('file_meeting_record over /acts: 201 once, then 409 naming the first; another firm viewer 403; a malformed body 400', async () => {
    const { act } = await filed()
    expect(act).toMatchObject({ id: 'REC-0001', kind: 'file_meeting_record', subject: { type: 'meeting', id: 'evt-010' } })
    const again = await call('POST', '/acts', ADRIAN, { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: act.fingerprint })
    expect(again).toMatchObject({ status: 409, body: { code: 'ALREADY_FILED', message: 'The record was already filed (REC-0001).' } })
    expect((await call('POST', '/acts', 'user-002', { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: act.fingerprint })).status).toBe(403)
    expect((await call('POST', '/acts', ADRIAN, { kind: 'file_meeting_record', eventId: 'evt-010' })).status).toBe(400)
    expect((await call('GET', '/meetings/evt-010', ADRIAN)).body.tasks).toHaveLength(6)
  })

  it('a filed record cannot be edited or deleted', async () => {
    const { view } = await filed()
    expect((await call('PUT', '/meetings/evt-010/notes', ADRIAN, { lines: view.notesDraft })).status).toBe(409)
    expect((await call('DELETE', '/meetings/evt-010', ADRIAN)).status).toBe(405)
    expect((await call('PATCH', '/acts', ADRIAN, {})).status).toBe(405)
  })

  it('the recap: 409 before filing, 201 then 200 after, sent through send_to_client', async () => {
    expect((await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' }))).toMatchObject({ status: 409, body: { code: 'NOT_FILED' } })
    await filed()
    const draft = await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' })
    expect(draft.status).toBe(201)
    expect(draft.body.recordBasis).toMatchObject({ eventId: 'evt-010', actId: 'REC-0001' })
    expect((await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' })).status).toBe(200)
    expect((await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, {})).status).toBe(400)
    const sent = await call('POST', '/acts', ADRIAN, { kind: 'send_to_client', draftId: draft.body.id })
    expect(sent.status).toBe(201)
    expect(sent.body.recordBasis).toMatchObject({ actId: 'REC-0001' })
  })

  it('household and client views for the firm', async () => {
    expect((await call('GET', '/households/hh-001', 'cco-001')).body).toMatchObject({ id: 'hh-001', shortName: 'Johnson' })
    expect((await call('GET', '/clients/cli-002', 'user-003')).body).toMatchObject({ id: 'cli-002', name: 'Patricia Johnson' })
    expect((await call('GET', '/households/hh-999', ADRIAN)).status).toBe(404)
  })
})

describe('a client probing the meeting', () => {
  it('is told every meeting, household, client and recap surface does not exist, before the body is read', async () => {
    for (const [method, path, body] of [
      ['GET', '/meetings', undefined], ['GET', '/meetings/evt-010', undefined], ['POST', '/meetings/evt-010/prep', undefined],
      ['POST', '/meetings/evt-010/agenda', { items: 'nonsense' }], ['POST', '/meetings/evt-010/hold', undefined],
      ['POST', '/meetings/evt-010/notes/draft', undefined], ['PUT', '/meetings/evt-010/notes', { lines: 'nonsense' }],
      ['GET', '/households/hh-001', undefined], ['GET', '/clients/cli-001', undefined], ['GET', '/clients/cli-002', undefined],
      ['POST', '/threads/th-robert/drafts/recap', { eventId: 'evt-010' }],
      ['POST', '/acts', { kind: 'file_meeting_record', eventId: 'evt-010', fingerprint: 'X' }],
    ] as const) {
      expect((await call(method, path, ROBERT, body)).status, `${method} ${path}`).toBe(404)
    }
    expect((await call('GET', '/meetings', undefined)).status).toBe(401)
    expect(store().meetings[0]?.state).toBe('scheduled')
  })

  it("sees the sent recap's record without the firm's provenance", async () => {
    await filed()
    const draft = await call('POST', '/threads/th-robert/drafts/recap', ADRIAN, { eventId: 'evt-010' })
    await call('POST', '/acts', ADRIAN, { kind: 'send_to_client', draftId: draft.body.id })
    const acts = (await call('GET', '/acts?threadId=th-robert', ROBERT)).body as Record<string, unknown>[]
    expect(acts).toHaveLength(1)
    expect(acts[0]).not.toHaveProperty('recordBasis')
    expect(acts[0]).not.toHaveProperty('editedBy')
    expect(JSON.stringify((await call('GET', '/threads/th-robert', ROBERT)).body)).not.toMatch(/transcript|REC-0001|task-|Mike|Sarah Mitchell/)
  })
})
```

Create `src/hooks/__tests__/use-meetings.test.tsx`:

```tsx
import { it, expect } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { ViewerProvider } from '@/workspace/viewer/ViewerProvider'
import { useHoldMeeting, useHousehold, useMeeting, useMeetings } from '@/hooks/use-meetings'

it('holding the meeting refreshes the meeting, the list and the household it belongs to', async () => {
  const client = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ViewerProvider>{children}</ViewerProvider></QueryClientProvider>
  )
  const { result } = renderHook(() => ({
    meeting: useMeeting('evt-010'), meetings: useMeetings(), household: useHousehold('hh-001'), hold: useHoldMeeting('evt-010'),
  }), { wrapper })
  await waitFor(() => expect(result.current.meeting.data?.state).toBe('scheduled'))
  await waitFor(() => expect(result.current.household.data?.meetings.upcoming).toHaveLength(1))
  await act(() => result.current.hold.mutateAsync())
  await waitFor(() => expect(result.current.meeting.data?.state).toBe('held'))
  await waitFor(() => expect(result.current.meetings.data?.[0]?.state).toBe('held'))
  await waitFor(() => expect(result.current.household.data?.meetings.past).toHaveLength(1))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-meetings-api.test.ts src/hooks/__tests__/use-meetings.test.tsx --testTimeout 30000`
Expected: FAIL — every meeting path answers 405 from the catch-all; the hooks do not exist.

- [ ] **Step 3: The handlers**

Create `src/mocks/handlers/workspace-meetings.ts`:

```ts
import { http, HttpResponse } from 'msw'
import type { AgendaItemInput, AgendaSource, NoteLineInput, TaskOwner } from '@/types/workspace-meeting'
import { isNoteSection } from '@/types/workspace-meeting'
import { AGENTS } from '../data/people'
import { holdMeeting, meetingSummaries, meetingView, reviseAgenda, saveNotes } from '../workspace/meetings'
import { draftMeetingNotes, runMeetingPrep } from '../workspace/meeting-agents'
import { draftRecap } from '../workspace/recap'
import { clientView, householdView } from '../workspace/household-views'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal } from './workspace-http'

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((x) => typeof x === 'string')

function parseSource(value: unknown): AgendaSource | undefined {
  if (!isRecord(value)) return undefined
  if (value.kind === 'advisor') return { kind: 'advisor' }
  return value.kind === 'finding' && nonEmptyString(value.messageId) ? { kind: 'finding', messageId: value.messageId } : undefined
}

/** An agenda body, checked for shape; the engine decides everything else. */
export function parseAgendaItems(value: unknown): { ok: true; items: AgendaItemInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: 'items must be a list.' }
  const items: AgendaItemInput[] = []
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.title !== 'string') return { ok: false, message: 'Each item needs a title.' }
    const source = parseSource(raw.source)
    if (!source) return { ok: false, message: 'Each item needs a source: the advisor, or a finding by its message id.' }
    if (raw.id !== undefined && !nonEmptyString(raw.id)) return { ok: false, message: 'An item id is a string.' }
    items.push({ ...(typeof raw.id === 'string' ? { id: raw.id } : {}), title: raw.title, source })
  }
  return { ok: true, items }
}

function parseOwner(value: unknown): Parsed<TaskOwner | undefined> {
  if (value === undefined) return { ok: true, value: undefined }
  if (isRecord(value) && value.kind === 'person' && nonEmptyString(value.personId)) return { ok: true, value: { kind: 'person', personId: value.personId } }
  if (isRecord(value) && value.kind === 'agent') {
    const agent = AGENTS.find((a) => a.id === value.agentId)
    if (agent) return { ok: true, value: { kind: 'agent', agentId: agent.id } }
  }
  return { ok: false, message: 'An owner is a person or an agent.' }
}

/** A notes body, checked for shape; the engine checks the citations, the owners and the due dates. */
export function parseNoteLines(value: unknown): { ok: true; lines: NoteLineInput[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: 'lines must be a list.' }
  const lines: NoteLineInput[] = []
  for (const raw of value) {
    if (!isRecord(raw) || !isNoteSection(raw.section) || typeof raw.text !== 'string' || !isStringList(raw.cites)) {
      return { ok: false, message: 'Each line needs a section (discussion, decisions, client_requests or follow_ups), its text and its citations.' }
    }
    if (raw.id !== undefined && !nonEmptyString(raw.id)) return { ok: false, message: 'A line id is a string.' }
    if (raw.due !== undefined && typeof raw.due !== 'string') return { ok: false, message: 'A due date is a string.' }
    const owner = parseOwner(raw.owner)
    if (!owner.ok) return owner
    lines.push({
      ...(typeof raw.id === 'string' ? { id: raw.id } : {}), section: raw.section, text: raw.text, cites: raw.cites,
      ...(owner.value ? { owner: owner.value } : {}), ...(typeof raw.due === 'string' ? { due: raw.due } : {}),
    })
  }
  return { ok: true, lines }
}

const viewOf = (viewerId: string, eventId: string, status: number) => {
  const view = meetingView(viewerId, eventId)
  return view ? HttpResponse.json(view, { status }) : notFound()
}
/** A shape error is a 400 only for a viewer who may see the meeting; anyone else learns nothing. */
const shapeRefusal = (viewerId: string, eventId: string, message: string) => (meetingView(viewerId, eventId) ? badRequest(message) : notFound())

/** Firm surfaces: a client gets 404 from each before anything about the request is read. */
export const workspaceMeetingHandlers = [
  http.get('/api/workspace/meetings', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const meetings = meetingSummaries(viewer.viewerId)
    return meetings ? HttpResponse.json(meetings) : notFound()
  }),

  http.get('/api/workspace/meetings/:eventId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    return viewOf(viewer.viewerId, String(params.eventId), 200)
  }),

  http.post('/api/workspace/meetings/:eventId/prep', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = runMeetingPrep(viewer.viewerId, String(params.eventId))
    return r.ok ? viewOf(viewer.viewerId, String(params.eventId), r.created ? 201 : 200) : refusal(r)
  }),

  http.post('/api/workspace/meetings/:eventId/agenda', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const eventId = String(params.eventId)
    const parsed = parseAgendaItems((await readJson(request))?.items)
    if (!parsed.ok) return shapeRefusal(viewer.viewerId, eventId, parsed.message)
    const r = reviseAgenda(viewer.viewerId, eventId, parsed.items)
    return r.ok ? viewOf(viewer.viewerId, eventId, 201) : refusal(r)
  }),

  http.post('/api/workspace/meetings/:eventId/hold', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = holdMeeting(viewer.viewerId, String(params.eventId))
    return r.ok ? viewOf(viewer.viewerId, String(params.eventId), 200) : refusal(r)
  }),

  http.post('/api/workspace/meetings/:eventId/notes/draft', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = draftMeetingNotes(viewer.viewerId, String(params.eventId))
    return r.ok ? viewOf(viewer.viewerId, String(params.eventId), r.created ? 201 : 200) : refusal(r)
  }),

  http.put('/api/workspace/meetings/:eventId/notes', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const eventId = String(params.eventId)
    const parsed = parseNoteLines((await readJson(request))?.lines)
    if (!parsed.ok) return shapeRefusal(viewer.viewerId, eventId, parsed.message)
    const r = saveNotes(viewer.viewerId, eventId, parsed.lines)
    return r.ok ? viewOf(viewer.viewerId, eventId, 200) : refusal(r)
  }),

  http.get('/api/workspace/households/:householdId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const view = householdView(viewer.viewerId, String(params.householdId))
    return view ? HttpResponse.json(view) : notFound()
  }),

  http.get('/api/workspace/clients/:clientId', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const view = clientView(viewer.viewerId, String(params.clientId))
    return view ? HttpResponse.json(view) : notFound()
  }),

  http.post('/api/workspace/threads/:id/drafts/recap', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    const eventId = body && nonEmptyString(body.eventId) ? body.eventId : undefined
    // The engine checks the thread before the meeting, so a missing eventId surfaces as 400 only to a viewer who may draft here.
    const r = draftRecap(viewer.viewerId, String(params.id), eventId ?? '')
    if (r.ok) return HttpResponse.json(r.draft, { status: r.created ? 201 : 200 })
    return eventId === undefined && r.code === 'NO_MEETING' ? badRequest('eventId is required.') : refusal(r)
  }),
]
```

In `src/mocks/handlers/workspace.ts`:

- import `fileMeetingRecord` from `'../workspace/meeting-acts'` and `workspaceMeetingHandlers` from `'./workspace-meetings'`;
- `withoutProvenance` also strips `recordBasis`:

```ts
const withoutProvenance = ({ subject: _subject, basis: _basis, recordBasis: _recordBasis, editedBy: _editedBy, messageId: _messageId, viaPresenter: _via, rationale: _rationale, ...act }: BindingAct): BindingAct => act
```

- in the `POST /api/workspace/acts` switch, before the compliance cases:

```ts
      case 'file_meeting_record': {
        if (!nonEmptyString(body.eventId) || !nonEmptyString(body.fingerprint)) return badRequest('eventId and fingerprint are required.')
        const r = fileMeetingRecord(viewer, body.eventId, body.fingerprint)
        return r.ok ? HttpResponse.json(r.act, { status: 201 }) : refusal(r)
      }
```

- register `...workspaceMeetingHandlers,` after `...workspaceSupervisionHandlers,` (above the catch-all).

- [ ] **Step 4: The client functions**

In `src/services/api-client.ts`, `put` becomes:

```ts
export function put<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }).then(handleResponse<T>)
}
```

In `src/services/workspace.ts`, change the first import to `import { get, post, put } from './api-client'`, add

```ts
import type { AgendaItemInput, MeetingSummary, MeetingView, NoteLineInput } from '@/types/workspace-meeting'
import type { ClientView, HouseholdView } from '@/types/workspace-household'
```

and append:

```ts
export const getMeetings = (viewer: string) =>
  get<MeetingSummary[]>('/workspace/meetings', undefined, as(viewer))
export const getMeeting = (viewer: string, eventId: string) =>
  get<MeetingView>(`/workspace/meetings/${eventId}`, undefined, as(viewer))
export const runMeetingPrep = (viewer: string, eventId: string) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/prep`, undefined, as(viewer))
export const reviseAgenda = (viewer: string, eventId: string, items: AgendaItemInput[]) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/agenda`, { items }, as(viewer))
export const holdMeeting = (viewer: string, eventId: string) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/hold`, undefined, as(viewer))
export const draftMeetingNotes = (viewer: string, eventId: string) =>
  post<MeetingView>(`/workspace/meetings/${eventId}/notes/draft`, undefined, as(viewer))
export const saveMeetingNotes = (viewer: string, eventId: string, lines: NoteLineInput[]) =>
  put<MeetingView>(`/workspace/meetings/${eventId}/notes`, { lines }, as(viewer))
export const fileMeetingRecord = (viewer: string, eventId: string, fingerprint: string) =>
  post<BindingAct>('/workspace/acts', { kind: 'file_meeting_record', eventId, fingerprint }, as(viewer))
export const draftRecap = (viewer: string, clientThreadId: string, eventId: string) =>
  post<Draft>(`/workspace/threads/${clientThreadId}/drafts/recap`, { eventId }, as(viewer))
export const getHousehold = (viewer: string, householdId: string) =>
  get<HouseholdView>(`/workspace/households/${householdId}`, undefined, as(viewer))
export const getClientView = (viewer: string, clientId: string) =>
  get<ClientView>(`/workspace/clients/${clientId}`, undefined, as(viewer))
```

- [ ] **Step 5: The hooks**

In `src/hooks/use-workspace.ts`, `function useInvalidateWorkspace()` becomes `export function useInvalidateWorkspace()`.

Create `src/hooks/use-meetings.ts`:

```ts
import { useMutation, useQuery } from '@tanstack/react-query'
import * as api from '@/services/workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { AgendaItemInput, NoteLineInput } from '@/types/workspace-meeting'
import { useInvalidateWorkspace } from './use-workspace'

export function useMeetings(enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'meetings'], queryFn: () => api.getMeetings(viewerId), enabled })
}

export function useMeeting(eventId: string) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'meeting', eventId], queryFn: () => api.getMeeting(viewerId, eventId) })
}

export function useHousehold(householdId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'household', householdId], queryFn: () => api.getHousehold(viewerId, householdId), enabled })
}

export function useClientView(clientId: string, enabled = true) {
  const { viewerId } = useViewer()
  return useQuery({ queryKey: ['workspace', viewerId, 'client', clientId], queryFn: () => api.getClientView(viewerId, clientId), enabled })
}

// Meeting mutations invalidate on settle, not success: a refused write (held meanwhile, notes moved) must refresh what is on screen too.

export function useRunMeetingPrep(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.runMeetingPrep(viewerId, eventId), onSettled: invalidate })
}

export function useReviseAgenda(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (items: AgendaItemInput[]) => api.reviseAgenda(viewerId, eventId, items), onSettled: invalidate })
}

export function useHoldMeeting(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.holdMeeting(viewerId, eventId), onSettled: invalidate })
}

export function useDraftMeetingNotes(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.draftMeetingNotes(viewerId, eventId), onSettled: invalidate })
}

export function useSaveMeetingNotes(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (lines: NoteLineInput[]) => api.saveMeetingNotes(viewerId, eventId, lines), onSettled: invalidate })
}

export function useFileMeetingRecord(eventId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (fingerprint: string) => api.fileMeetingRecord(viewerId, eventId, fingerprint), onSettled: invalidate })
}

export function useDraftRecap(clientThreadId: string) {
  const { viewerId } = useViewer()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (eventId: string) => api.draftRecap(viewerId, clientThreadId, eventId), onSettled: invalidate })
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/mocks/handlers/__tests__/workspace-meetings-api.test.ts src/hooks/__tests__/use-meetings.test.tsx src/mocks/handlers/__tests__/workspace-write.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 8: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/mocks/handlers/workspace-meetings.ts src/mocks/handlers/workspace.ts src/services/api-client.ts src/services/workspace.ts \
  src/hooks/use-meetings.ts src/hooks/use-workspace.ts \
  src/mocks/handlers/__tests__/workspace-meetings-api.test.ts src/hooks/__tests__/use-meetings.test.tsx
git commit -m "feat(meetings): meeting, household, client and recap endpoints; file_meeting_record over /acts; hooks"
```

---
### Task 10: Shared meeting UI pieces — the controls, the agenda editor, the household summary

The parts the meeting thread's context column, the meeting full view and the household full view all use: the advisor's meeting controls (**Run prep**, **Hold the meeting**, **Draft notes**, **File the record** — each guarded against a double click), the agenda editor (each change a version), and the household summary panes. Kit components only; every figure arrives from the engine and is formatted by `measure.ts`.

**Files:**
- Create: `src/workspace/meeting/meeting-words.ts`, `src/workspace/meeting/MeetingControls.tsx`, `src/workspace/meeting/AgendaEditor.tsx`, `src/workspace/meeting/agenda-findings.ts`, `src/workspace/household/HouseholdSummaryPanes.tsx`, `src/workspace/household/AccountsTable.tsx`, `src/workspace/household/household-words.ts`
- Test: `src/workspace/__tests__/meeting-pieces.test.tsx` (new)

**Interfaces:**
- Consumes: the Task 9 hooks; `ConfirmRecord` from `@/workspace/context/ConfirmRecord`; `Dialog`, `Button`, `TextInput`, `Tag`, `DataTable`, `Num`, `StatusCode`, `Pane`; `RESIDUAL_WORDS` from `@/workspace/proposal/residual-words`; `assetClassLabel`; `fmtDate`, `fmtDrift`, `fmtEasternTime`, `fmtMoney`, `fmtResult`, `fmtTolerance`, `fmtWeight`, `UNIT`.
- Produces:

```ts
// src/workspace/meeting/meeting-words.ts
export const MEETING_STATE_TAG: Readonly<Record<MeetingState, string>>    // SCHEDULED / HELD / FILED
export const ADVISOR_RUNS_IT = 'Only the advisor runs the meeting: prep, the agenda, holding it and its notes.'

// src/workspace/meeting/agenda-findings.ts
export type AgendaFinding = { messageId: string; claim: string }
export function agendaFindings(messages: readonly Message[]): AgendaFinding[]   // agent findings and carried findings, in thread order

// src/workspace/meeting/MeetingControls.tsx
export function MeetingControls(props: { meeting: MeetingView; canPrepare: boolean; onRecorded: (actId: string) => void; filingBlockedReason?: string }): JSX.Element

// src/workspace/meeting/AgendaEditor.tsx
export function AgendaEditor(props: { meeting: MeetingView; findings: AgendaFinding[]; editable: boolean }): JSX.Element

// src/workspace/household/HouseholdSummaryPanes.tsx
export function HouseholdSummaryPanes(props: { summary: HouseholdSummary }): JSX.Element
// src/workspace/household/AccountsTable.tsx (also used by the client view, Task 13)
export function AccountsTable(props: { caption: string; accounts: HouseholdAccount[]; totalValue: number; totalLabel: string }): JSX.Element

// src/workspace/household/household-words.ts
export const GOAL_STATUS_TAG: Readonly<Record<GoalStatus, string>>
```

Exact strings: **Run prep** reports `Meeting Prep posted its findings and agenda v1.` or `Meeting Prep has reported; the agenda is unchanged.`; the hold dialog is titled `Hold the meeting?` with description `The session clock moves to the end of the meeting, 15:15 ET, and the transcript arrives. Prep and the agenda close.` and buttons `Cancel` / `Hold the meeting`; **Draft notes** reports `Meeting Notes drafted the notes; edit them beside the transcript in the meeting view.`; the filing dialog is titled `File the record of the Johnson annual review?` with description `Filing records the notes as they stand, with their fingerprint, and creates the follow-up tasks. A filed record cannot be changed.`; filed reads `Filed · REC-…`.

- [ ] **Step 1: Write the failing tests**

Create `src/workspace/__tests__/meeting-pieces.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getHousehold, getMeeting, reviseAgenda, runMeetingPrep, holdMeeting, draftMeetingNotes } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { useMeeting } from '@/hooks/use-meetings'
import { MeetingControls } from '@/workspace/meeting/MeetingControls'
import { AgendaEditor } from '@/workspace/meeting/AgendaEditor'
import { agendaFindings } from '@/workspace/meeting/agenda-findings'
import { HouseholdSummaryPanes } from '@/workspace/household/HouseholdSummaryPanes'

const ADRIAN = 'user-001'
const meeting = () => store().meetings[0]!

/** The controls as the context column mounts them: reading the live meeting, so each write re-renders them. */
function LiveControls({ canPrepare = true }: { canPrepare?: boolean }) {
  const view = useMeeting('evt-010')
  return view.data ? <MeetingControls meeting={view.data} canPrepare={canPrepare} onRecorded={() => undefined} /> : <p role="status">Loading the meeting…</p>
}
function LiveAgenda() {
  const view = useMeeting('evt-010')
  if (!view.data) return <p role="status">Loading the meeting…</p>
  const findings = agendaFindings(store().messages.filter((m) => m.threadId === 'th-johnson-meeting'))
  return <AgendaEditor meeting={view.data} findings={findings} editable />
}

describe('meeting controls', () => {
  afterEach(() => sessionStorage.clear())

  it('runs prep, then holds the meeting once however hard Confirm is clicked', async () => {
    renderWithProviders(<LiveControls />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Run prep' }))
    expect(await screen.findByText('Meeting Prep posted its findings and agenda v1.')).toBeInTheDocument()
    expect(meeting().agenda).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Hold the meeting' }))
    const dialog = screen.getByRole('dialog', { name: 'Hold the meeting?' })
    expect(dialog).toHaveTextContent('The session clock moves to the end of the meeting, 15:15 ET, and the transcript arrives. Prep and the agenda close.')
    await user.dblClick(within(dialog).getByRole('button', { name: 'Hold the meeting' }))
    await screen.findByRole('button', { name: 'Draft notes' })
    expect(store().messages.filter((m) => m.kind === 'meeting_held')).toHaveLength(1)
  })

  it('drafts the notes, then files the record once, naming the act', async () => {
    await holdMeeting(ADRIAN, 'evt-010')
    renderWithProviders(<LiveControls />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Draft notes' }))
    expect(await screen.findByText('Meeting Notes drafted the notes; edit them beside the transcript in the meeting view.')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'File the record' }))
    const dialog = screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })
    await user.dblClick(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Filed · REC-0001')).toBeInTheDocument()
    expect(store().acts.filter((a) => a.kind === 'file_meeting_record')).toHaveLength(1)
  })

  it('a blocked filing says why and cannot be confirmed', async () => {
    await holdMeeting(ADRIAN, 'evt-010')
    await draftMeetingNotes(ADRIAN, 'evt-010')
    const view = await getMeeting(ADRIAN, 'evt-010')
    renderWithProviders(<MeetingControls meeting={view} canPrepare onRecorded={() => undefined} filingBlockedReason="Save your edits before filing." />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'File the record' }))
    const dialog = screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })
    expect(dialog).toHaveTextContent('Save your edits before filing.')
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })

  it('a firm viewer who does not run the meeting sees why, and no control', async () => {
    const view = await getMeeting('user-002', 'evt-010')
    renderWithProviders(<MeetingControls meeting={view} canPrepare={false} onRecorded={() => undefined} />)
    expect(screen.getByText('Only the advisor runs the meeting: prep, the agenda, holding it and its notes.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('the agenda editor', () => {
  it('moves, drops and adds items, each a new version; findings not on the agenda can be added', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const v1 = meeting().agenda[0]!.items
    await reviseAgenda(ADRIAN, 'evt-010', v1.slice(1))
    renderWithProviders(<LiveAgenda />)
    const user = userEvent.setup()
    const list = await screen.findByRole('list', { name: 'Agenda · v2' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(v1.length - 1)
    await user.click(within(list).getByRole('button', { name: `Move “${v1[2]!.title}” up` }))
    await screen.findByRole('list', { name: 'Agenda · v3' })
    expect(meeting().agenda[2]!.items.map((i) => i.id).slice(0, 2)).toEqual([v1[2]!.id, v1[1]!.id])
    await user.type(screen.getByRole('textbox', { name: 'New agenda item' }), 'ESG alternatives for the trust')
    await user.click(screen.getByRole('button', { name: 'Add to agenda' }))
    await screen.findByRole('list', { name: 'Agenda · v4' })
    const dropped = meeting().agenda[0]!.items[0]!
    const finding = store().messages.find((m) => m.kind === 'agent_finding' && m.id === (dropped.source.kind === 'finding' ? dropped.source.messageId : ''))
    if (finding?.kind !== 'agent_finding') throw new Error('agenda v1 carries its findings')
    await user.click(screen.getByRole('button', { name: `Add to agenda: ${finding.claim}` }))
    const v5 = await screen.findByRole('list', { name: 'Agenda · v5' })
    expect(v5).toHaveTextContent(finding.claim)
    await user.click(within(v5).getByRole('button', { name: 'Drop “ESG alternatives for the trust”' }))
    await screen.findByRole('list', { name: 'Agenda · v6' })
    expect(meeting().agenda.map((v) => v.n)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('a read-only agenda has no controls', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const view = await getMeeting(ADRIAN, 'evt-010')
    renderWithProviders(<AgendaEditor meeting={view} findings={[]} editable={false} />)
    expect(screen.getByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('the household summary', () => {
  it('shows the accounts against their models, held-away accounts, goals, windows, the IPS and open items', async () => {
    renderWithProviders(<HouseholdSummaryPanes summary={await getHousehold(ADRIAN, 'hh-001')} />)
    const accounts = screen.getByRole('table', { name: 'Household accounts' })
    expect(within(accounts).getAllByRole('row').map((r) => r.textContent).join('|')).toContain('Johnson Family Trust')
    expect(accounts).toHaveTextContent('Robert Johnson Individual')
    expect(screen.getByRole('table', { name: 'Held-away accounts' })).toHaveTextContent('2,400,000')
    expect(screen.getByText("The firm does not manage these and cannot see their holdings; a purchase in them still counts for the taxpayer's wash-sale windows.")).toBeInTheDocument()
    const goals = screen.getByRole('table', { name: 'Plan goals' })
    expect(within(goals).getByRole('row', { name: /Legacy \/ Estate/ })).toHaveTextContent(/78\.0.*85\.0.*AT RISK/)
    const windows = screen.getByRole('table', { name: 'Open wash-sale windows' })
    expect(within(windows).getByRole('row', { name: /INTC/ })).toHaveTextContent(/2026-02-20.*−32,750.*2026-03-22/)
    expect(screen.getByRole('region', { name: 'IPS and open items' })).toHaveTextContent('Johnson Family Trust — IPS · signed 2025-11-15')
    expect(screen.getByRole('region', { name: 'IPS and open items' })).toHaveTextContent('Awaiting signature: Tax Loss Harvesting Proposal')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/workspace/__tests__/meeting-pieces.test.tsx --testTimeout 30000`
Expected: FAIL — the components do not exist.

- [ ] **Step 3: Words and the findings an agenda can carry**

Create `src/workspace/meeting/meeting-words.ts`:

```ts
import type { MeetingState } from '@/types/workspace-meeting'

export const MEETING_STATE_TAG: Readonly<Record<MeetingState, string>> = { scheduled: 'SCHEDULED', held: 'HELD', filed: 'FILED' }

export const ADVISOR_RUNS_IT = 'Only the advisor runs the meeting: prep, the agenda, holding it and its notes.'
```

Create `src/workspace/meeting/agenda-findings.ts`:

```ts
import type { Message } from '@/types/workspace'

/** A finding the agenda can carry: posted in the meeting thread by an agent, or carried into it from the Brief. */
export type AgendaFinding = { messageId: string; claim: string }

export function agendaFindings(messages: readonly Message[]): AgendaFinding[] {
  return messages.flatMap((m) => (m.kind === 'agent_finding' ? [{ messageId: m.id, claim: m.claim }]
    : m.kind === 'carried' ? [{ messageId: m.id, claim: m.finding.claim }]
    : []))
}
```

Create `src/workspace/household/household-words.ts`:

```ts
import type { GoalStatus } from '@/types/planning'

export const GOAL_STATUS_TAG: Readonly<Record<GoalStatus, string>> = { on_track: 'ON TRACK', at_risk: 'AT RISK', off_track: 'OFF TRACK', not_analyzed: 'NOT ANALYZED' }
```

- [ ] **Step 4: The controls**

Create `src/workspace/meeting/MeetingControls.tsx`:

```tsx
import { useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Dialog } from '@/kit/dialog/Dialog'
import { fmtEasternTime } from '@/kit/measure'
import { useDraftMeetingNotes, useFileMeetingRecord, useHoldMeeting, useRunMeetingPrep } from '@/hooks/use-meetings'
import { ConfirmRecord } from '@/workspace/context/ConfirmRecord'
import type { MeetingView } from '@/types/workspace-meeting'
import { ADVISOR_RUNS_IT } from './meeting-words'

type MeetingControlsProps = { meeting: MeetingView; canPrepare: boolean; onRecorded: (actId: string) => void; filingBlockedReason?: string }

/** What the advisor can do next with the meeting, by its state: prep and hold it, draft its notes, file its record. */
export function MeetingControls({ meeting, canPrepare, onRecorded, filingBlockedReason }: MeetingControlsProps) {
  if (!canPrepare) return <p className="text-body text-ink-2">{ADVISOR_RUNS_IT}</p>
  switch (meeting.state) {
    case 'scheduled': return <BeforeTheMeeting meeting={meeting} />
    case 'held': return <AfterTheMeeting meeting={meeting} onRecorded={onRecorded} filingBlockedReason={filingBlockedReason} />
    case 'filed': return <p className="text-body text-ink-2">{`Filed · ${meeting.filedActId ?? ''}`}</p>
  }
}

function BeforeTheMeeting({ meeting }: { meeting: MeetingView }) {
  const prep = useRunMeetingPrep(meeting.eventId)
  const hold = useHoldMeeting(meeting.eventId)
  const [report, setReport] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  // Refs, not render state, so a second click in the same frame cannot start a second request.
  const prepping = useRef(false)
  const holding = useRef(false)
  const runPrep = () => {
    if (prepping.current) return
    prepping.current = true
    const before = meeting.agenda.length
    setReport(undefined)
    prep.mutate(undefined, {
      onSuccess: (view) => setReport(view.agenda.length > before ? 'Meeting Prep posted its findings and agenda v1.' : 'Meeting Prep has reported; the agenda is unchanged.'),
      onSettled: () => { prepping.current = false },
    })
  }
  const confirmHold = () => {
    if (holding.current) return
    holding.current = true
    hold.mutate(undefined, { onSuccess: () => setConfirming(false), onSettled: () => { holding.current = false } })
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <Button rank="secondary" disabled={prep.isPending} onClick={runPrep}>Run prep</Button>
        <Button onClick={() => { hold.reset(); setConfirming(true) }}>Hold the meeting</Button>
      </div>
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
      {prep.isError ? <p role="alert" className="text-body">{prep.error.message}</p> : null}
      <Dialog open={confirming} onOpenChange={(open) => { if (!open && !hold.isPending) setConfirming(false) }} title="Hold the meeting?"
        description={`The session clock moves to the end of the meeting, ${fmtEasternTime(meeting.end)} ET, and the transcript arrives. Prep and the agenda close.`}>
        <div className="flex flex-col gap-4">
          {hold.isError ? <p role="alert" className="text-body">{hold.error.message}</p> : null}
          <div className="flex justify-end gap-3">
            <Button rank="secondary" disabled={hold.isPending} onClick={() => setConfirming(false)}>Cancel</Button>
            <Button disabled={hold.isPending} onClick={confirmHold}>Hold the meeting</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function AfterTheMeeting({ meeting, onRecorded, filingBlockedReason }: { meeting: MeetingView; onRecorded: (actId: string) => void; filingBlockedReason?: string }) {
  const draft = useDraftMeetingNotes(meeting.eventId)
  const file = useFileMeetingRecord(meeting.eventId)
  const [report, setReport] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const drafting = useRef(false)
  const askForNotes = () => {
    if (drafting.current) return
    drafting.current = true
    draft.mutate(undefined, {
      onSuccess: () => setReport('Meeting Notes drafted the notes; edit them beside the transcript in the meeting view.'),
      onSettled: () => { drafting.current = false },
    })
  }
  const fingerprint = meeting.notesFingerprint
  return (
    <div className="flex flex-col items-start gap-3">
      {fingerprint === undefined
        ? <Button disabled={draft.isPending} onClick={askForNotes}>Draft notes</Button>
        : <Button onClick={() => { file.reset(); setConfirming(true) }}>File the record</Button>}
      {report ? <p role="status" className="text-body text-ink-2">{report}</p> : null}
      {draft.isError ? <p role="alert" className="text-body">{draft.error.message}</p> : null}
      {fingerprint !== undefined ? (
        <ConfirmRecord open={confirming} onClose={() => setConfirming(false)} mutation={file} variables={fingerprint} onRecorded={onRecorded}
          title={`File the record of the ${meeting.title}?`}
          description="Filing records the notes as they stand, with their fingerprint, and creates the follow-up tasks. A filed record cannot be changed."
          blockedReason={filingBlockedReason} />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: The agenda editor**

Create `src/workspace/meeting/AgendaEditor.tsx`:

```tsx
import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { TextInput } from '@/kit/text-input/TextInput'
import { useReviseAgenda } from '@/hooks/use-meetings'
import type { AgendaItem, AgendaItemInput, MeetingView } from '@/types/workspace-meeting'
import type { AgendaFinding } from './agenda-findings'

type AgendaEditorProps = { meeting: MeetingView; findings: AgendaFinding[]; editable: boolean }

const asInput = ({ id, title, source }: AgendaItem): AgendaItemInput => ({ id, title, source })
const swap = <T,>(list: readonly T[], i: number, j: number): T[] => list.map((x, k) => (k === i ? list[j]! : k === j ? list[i]! : x))

/** The current agenda. Editable, each change — a move, a drop, an addition — is sent as the whole new agenda and becomes a new version. */
export function AgendaEditor({ meeting, findings, editable }: AgendaEditorProps) {
  const current = meeting.agenda[meeting.agenda.length - 1]
  const revise = useReviseAgenda(meeting.eventId)
  const [title, setTitle] = useState('')
  const busy = useRef(false)
  const findingsId = useId()
  const items = current?.items ?? []
  const send = (next: AgendaItemInput[], onDone?: () => void) => {
    if (busy.current) return
    busy.current = true
    revise.mutate(next, { onSuccess: () => onDone?.(), onSettled: () => { busy.current = false } })
  }
  const onAgenda = new Set(items.flatMap((i) => (i.source.kind === 'finding' ? [i.source.messageId] : [])))
  const unplaced = findings.filter((f) => !onAgenda.has(f.messageId))
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {current ? (
        <ol aria-label={`Agenda · v${current.n}`} className="flex list-decimal flex-col pl-5">
          {items.map((item, i) => (
            <li key={item.id} className="border-b border-rule py-2 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-body">{item.title}</span>
                {editable ? (
                  <span className="flex gap-1">
                    <Button rank="quiet" aria-label={`Move “${item.title}” up`} disabled={i === 0 || revise.isPending}
                      onClick={() => send(swap(items, i, i - 1).map(asInput))}>Move up</Button>
                    <Button rank="quiet" aria-label={`Move “${item.title}” down`} disabled={i === items.length - 1 || revise.isPending}
                      onClick={() => send(swap(items, i, i + 1).map(asInput))}>Move down</Button>
                    <Button rank="quiet" aria-label={`Drop “${item.title}”`} disabled={items.length === 1 || revise.isPending}
                      onClick={() => send(items.filter((x) => x.id !== item.id).map(asInput))}>Drop</Button>
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="text-body text-ink-3">No agenda yet. Run prep, or add the first item.</p>}
      {editable ? (
        <div className="flex flex-col items-start gap-2">
          <TextInput label="New agenda item" rows={1} value={title} onChange={setTitle} />
          <Button rank="secondary" disabled={title.trim() === '' || revise.isPending}
            onClick={() => send([...items.map(asInput), { title, source: { kind: 'advisor' } }], () => setTitle(''))}>Add to agenda</Button>
        </div>
      ) : null}
      {editable && unplaced.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 id={findingsId} className="text-label uppercase text-ink-3">Findings not on the agenda</h3>
          <ul aria-labelledby={findingsId} className="flex flex-col gap-2">
            {unplaced.map((f) => (
              <li key={f.messageId} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body text-ink-2">{f.claim}</span>
                <Button rank="quiet" aria-label={`Add to agenda: ${f.claim}`} disabled={revise.isPending}
                  onClick={() => send([...items.map(asInput), { title: f.claim, source: { kind: 'finding', messageId: f.messageId } }])}>Add</Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {revise.isError ? <p role="alert" className="text-body">{revise.error.message}</p> : null}
    </div>
  )
}
```

- [ ] **Step 6: The household summary panes**

Create `src/workspace/household/AccountsTable.tsx`:

```tsx
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import { UNIT, fmtDrift, fmtMoney, fmtTolerance, fmtWeight } from '@/kit/measure'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { HouseholdAccount } from '@/types/workspace-household'

const outsideWords = (a: HouseholdAccount) => a.outside
  .map((o) => `${assetClassLabel(o.assetClass)} ${fmtDrift(o.drift)} ${UNIT.pp}${o.residual ? ` · ${RESIDUAL_WORDS[o.residual]}` : ''}`).join('; ')

type AccountsTableProps = { caption: string; accounts: HouseholdAccount[]; totalValue: number; totalLabel: string }

/** Managed accounts against their models: value, largest drift against the band, and what sits outside it and why. */
export function AccountsTable({ caption, accounts, totalValue, totalLabel }: AccountsTableProps) {
  const rowsTotal = accounts.reduce((s, a) => s + a.value, 0)
  return (
    <DataTable caption={caption} rows={accounts} getRowId={(a) => a.accountId} total={accounts.length}
      noun={{ singular: 'account', plural: 'accounts' }}
      columns={[
        { id: 'account', header: 'Account', cell: (a) => a.name, sortValue: (a) => a.name },
        { id: 'owner', header: 'Owner', cell: (a) => a.ownerName },
        { id: 'model', header: 'Model', cell: (a) => a.modelName },
        { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (a) => <Num text={fmtMoney(a.value)} />, sortValue: (a) => a.value },
        { id: 'drift', header: 'Largest drift', unit: UNIT.pp, align: 'right', cell: (a) => <Num text={fmtWeight(a.maxAbsDrift)} />, sortValue: (a) => a.maxAbsDrift },
        { id: 'band', header: 'Band', unit: UNIT.pp, align: 'right', cell: (a) => fmtTolerance(a.driftTolerance) },
        { id: 'status', header: 'Status', cell: (a) => <StatusCode status={a.withinBand ? 'IN' : 'OUT'} label={a.withinBand ? 'inside its band' : 'outside its band'} /> },
        { id: 'outside', header: 'Outside its band', wrap: true, cell: (a) => outsideWords(a) },
      ]}
      totals={{ label: totalLabel, tiesTo: { label: 'the value the engine states', expected: totalValue, actual: rowsTotal }, cells: { value: fmtMoney(totalValue) } }} />
  )
}
```

Create `src/workspace/household/HouseholdSummaryPanes.tsx`:

```tsx
import { useId } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { Tag } from '@/kit/tag/Tag'
import { UNIT, fmtDate, fmtMoney, fmtResult, fmtWeight } from '@/kit/measure'
import type { HouseholdSummary } from '@/types/workspace-household'
import { AccountsTable } from './AccountsTable'
import { GOAL_STATUS_TAG } from './household-words'

/** The household as the engine measures it: managed accounts against their models, what is held away, the plan, the taxpayer's windows, the IPS. */
export function HouseholdSummaryPanes({ summary }: { summary: HouseholdSummary }) {
  const ipsTitleId = useId()
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Pane title="Managed accounts" meta={`${fmtMoney(summary.managedValue)} ${UNIT.usd}`}>
        <AccountsTable caption="Household accounts" accounts={summary.accounts} totalValue={summary.managedValue} totalLabel="Managed" />
      </Pane>
      <Pane title="Held away · outside the firm's view" meta={`${fmtMoney(summary.heldAwayValue)} ${UNIT.usd}`}>
        <p className="text-body text-ink-2">The firm does not manage these and cannot see their holdings; a purchase in them still counts for the taxpayer's wash-sale windows.</p>
        <DataTable caption="Held-away accounts" rows={summary.heldAway} getRowId={(h) => h.id} total={summary.heldAway.length}
          noun={{ singular: 'account', plural: 'accounts' }}
          columns={[
            { id: 'owner', header: 'Owner', cell: (h) => h.ownerName },
            { id: 'institution', header: 'Institution', cell: (h) => h.institution },
            { id: 'plan', header: 'Plan', cell: (h) => h.accountType },
            { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (h) => <Num text={fmtMoney(h.value)} />, sortValue: (h) => h.value },
            { id: 'reported', header: 'Reported', cell: (h) => fmtDate(h.reportedOn) },
          ]} />
      </Pane>
      <Pane title="Plan goals" meta={summary.planProbability !== undefined ? `Plan probability ${fmtWeight(summary.planProbability)} ${UNIT.pct}` : undefined}>
        <DataTable caption="Plan goals" rows={summary.goals} getRowId={(g) => g.id} total={summary.goals.length} noun={{ singular: 'goal', plural: 'goals' }}
          columns={[
            { id: 'goal', header: 'Goal', cell: (g) => g.name },
            { id: 'probability', header: 'Probability', unit: UNIT.pct, align: 'right', cell: (g) => <Num text={fmtWeight(g.probability)} />, sortValue: (g) => g.probability },
            { id: 'funded', header: 'Funded', unit: UNIT.pct, align: 'right', cell: (g) => <Num text={fmtWeight(g.funded)} />, sortValue: (g) => g.funded },
            { id: 'status', header: 'Status', cell: (g) => <Tag tone={g.status === 'on_track' ? 'outline' : 'solid'}>{GOAL_STATUS_TAG[g.status]}</Tag> },
          ]} />
      </Pane>
      <Pane title="Wash-sale windows · the taxpayer">
        {summary.windows.length === 0 ? <p className="text-body text-ink-3">No open window.</p> : (
          <DataTable caption="Open wash-sale windows" rows={summary.windows} getRowId={(w) => w.saleId} total={summary.windows.length}
            noun={{ singular: 'window', plural: 'windows' }}
            columns={[
              { id: 'symbol', header: 'Symbol', cell: (w) => w.symbol },
              { id: 'account', header: 'Sold in', cell: (w) => w.accountName },
              { id: 'sold', header: 'Sold', cell: (w) => fmtDate(w.saleDate) },
              { id: 'loss', header: 'Loss', unit: UNIT.usd, align: 'right', cell: (w) => <Num text={fmtResult(w.loss)} /> },
              { id: 'through', header: 'Through', cell: (w) => fmtDate(w.through) },
            ]} />
        )}
      </Pane>
      <section aria-labelledby={ipsTitleId} className="flex min-w-0 flex-col gap-3">
        <div className="border-b border-ink pb-2"><h2 id={ipsTitleId} className="text-label uppercase text-ink-2">IPS and open items</h2></div>
        <p className="text-body">{summary.ips
          ? `${summary.ips.name} · ${summary.ips.signedOn ? `signed ${fmtDate(summary.ips.signedOn)}` : summary.ips.signatureStatus.replace('_', ' ')}`
          : 'No investment policy statement on file.'}</p>
        {summary.openItems.length === 0 ? <p className="text-body text-ink-3">No open items.</p> : (
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {summary.openItems.map((i) => <li key={i.id} className="text-body">{i.text}</li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/meeting-pieces.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green, the guardrails included (kit elements only, measure only, instrument tokens only).

- [ ] **Step 9: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/workspace/meeting/meeting-words.ts src/workspace/meeting/MeetingControls.tsx src/workspace/meeting/AgendaEditor.tsx src/workspace/meeting/agenda-findings.ts \
  src/workspace/household/HouseholdSummaryPanes.tsx src/workspace/household/AccountsTable.tsx src/workspace/household/household-words.ts src/workspace/__tests__/meeting-pieces.test.tsx
git commit -m "feat(meetings): meeting controls, the agenda editor and the household summary panes"
```

---
### Task 11: The meeting thread — its context panel, the Brief's line, carrying a finding in

Adrian goes from the Brief's "Meeting at 14:00 ET" line to the meeting thread, runs prep there, shapes the agenda in the context column (carrying a Brief finding in if he wants), holds the meeting, asks for the notes and files the record; the slip and the task list follow in the thread, and the task table sits in the context column. The context column links the meeting, household and client full views.

**Files:**
- Create: `src/workspace/context/MeetingPanel.tsx`, `src/workspace/thread/carry-targets.ts`
- Modify: `src/workspace/context/ContextColumn.tsx`, `src/workspace/context/FullViews.tsx`, `src/workspace/thread/CarryControl.tsx`
- Test: `src/workspace/__tests__/meeting-thread.test.tsx` (new), `src/workspace/__tests__/carry-targets.test.ts` (new)

**Interfaces:**
- Consumes: `MeetingControls`, `AgendaEditor`, `agendaFindings`, `TaskTable`, `MEETING_STATE_TAG` (Tasks 2, 10); `useMeetings`, `useMeeting`, `useHousehold`, `useClientView` (Task 9); `meetingFullViewHref`, `householdFullViewHref`, `clientFullViewHref`, `accountFullViewHref` (Task 2); `useAccount` from `@/hooks/use-accounts`.
- Produces:

```ts
// src/workspace/context/MeetingPanel.tsx
export function MeetingPanel(props: { thread: Thread; directory: Directory; onRecorded: (actId: string) => void }): JSX.Element | null

// src/workspace/context/FullViews.tsx (signature changed)
export function FullViews(props: { subject: Subject; threadId: string }): JSX.Element | null

// src/workspace/thread/carry-targets.ts
export type CarryTarget = { thread: Thread; label: string }
export function carryTargets(threads: readonly Thread[], viewerId: string, subject: Subject | undefined, householdId: string | undefined): CarryTarget[]
```

Exact strings: section `Meeting`; its first lines `Annual Review — Johnson Household` and `2026-02-25 · 14:00–15:15 ET · Office — Main`; link `Open the meeting view`; heading `Agenda`; filed tasks table `Follow-up tasks`; full-view links `Meeting · Johnson annual review`, `Johnson Household`, `Robert Johnson`, `Patricia Johnson`; the Brief's carry button for the meeting thread `Take to Johnson annual review`.

- [ ] **Step 1: Write the failing tests**

Create `src/workspace/__tests__/carry-targets.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { carryTargets } from '@/workspace/thread/carry-targets'
import { SEED_THREADS } from '@/mocks/data/workspace-seed'

describe('where the Brief can carry a finding', () => {
  it("to the team thread about the same account, and to the meeting thread of the account's household", () => {
    expect(carryTargets(SEED_THREADS, 'user-001', { type: 'account', id: 'acc-002' }, 'hh-001').map((t) => [t.thread.id, t.label])).toEqual([
      ['th-johnson-review', 'Take to team thread'],
      ['th-johnson-meeting', 'Take to Johnson annual review'],
    ])
  })
  it('nowhere without a subject, and to no thread the viewer is not a member of', () => {
    expect(carryTargets(SEED_THREADS, 'user-001', undefined, 'hh-001')).toEqual([])
    expect(carryTargets(SEED_THREADS, 'cco-001', { type: 'account', id: 'acc-002' }, 'hh-001')).toEqual([])
  })
})
```

Create `src/workspace/__tests__/meeting-thread.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { draftMeetingNotes, holdMeeting, runMeetingPrep } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const meetingSection = () => inContext().findByRole('region', { name: 'Meeting' })
const INTC_CLAIM = 'Intel Corp. can be sold at a loss today, and nothing bought in the last thirty days would wash the loss.'

async function openMeetingThread() {
  renderRoutes(routes, '/t/th-johnson-meeting')
  await screen.findByRole('heading', { level: 1, name: 'Johnson annual review' })
  return meetingSection()
}

describe('the meeting thread', () => {
  afterEach(() => sessionStorage.clear())

  it("the Brief's line opens the meeting thread; a Brief finding can be carried into it", async () => {
    const { router } = renderRoutes(routes, '/t/th-brief')
    const user = userEvent.setup()
    const intc = await screen.findByRole('article', { name: `Harvest Scanner: ${INTC_CLAIM}` })
    await user.click(within(intc).getByRole('button', { name: 'Take to Johnson annual review' }))
    expect(await within(intc).findByRole('status')).toHaveTextContent('Taken to Johnson annual review.')
    const notice = conversation().getByRole('article', { name: 'Meeting · Johnson annual review' })
    await user.click(within(notice).getByRole('link', { name: /Open the meeting thread/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/t/th-johnson-meeting'))
    expect(await conversation().findByRole('article', { name: `Carried from the Brief: ${INTC_CLAIM}` })).toBeInTheDocument()
  })

  it('states the meeting and runs prep: findings in the thread, agenda v1 in the panel', async () => {
    const panel = await openMeetingThread()
    expect(panel).toHaveTextContent('Annual Review — Johnson Household')
    expect(panel).toHaveTextContent('2026-02-25 · 14:00–15:15 ET · Office — Main')
    expect(panel).toHaveTextContent('SCHEDULED')
    expect(within(panel).getByRole('link', { name: /Open the meeting view/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(within(panel).getByText('No agenda yet. Run prep, or add the first item.')).toBeInTheDocument()
    await userEvent.setup().click(within(panel).getByRole('button', { name: 'Run prep' }))
    expect(await within(panel).findByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    expect(await conversation().findByRole('article', { name: 'Agenda v1 · Meeting Prep' })).toBeInTheDocument()
    expect(conversation().getAllByRole('article', { name: /^Meeting Prep: / }).length).toBe(7)
    // A meeting's attention items are for discussion: no breach code.
    expect(screen.getByRole('list', { name: 'Messages' }).querySelector('[data-status="OUT"]')).toBeNull()
  })

  it('holds, drafts, files once; the slip takes focus, then the task list follows', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    const panel = await openMeetingThread()
    const user = userEvent.setup()
    await user.click(within(panel).getByRole('button', { name: 'Hold the meeting' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Hold the meeting?' })).getByRole('button', { name: 'Hold the meeting' }))
    expect(await conversation().findByRole('article', { name: 'Meeting held' })).toHaveTextContent('Meeting held · 14:00–15:15 ET · transcript received')
    await user.click(await within(await meetingSection()).findByRole('button', { name: 'Draft notes' }))
    expect(await conversation().findByRole('article', { name: 'Notes drafted · Meeting Notes' })).toBeInTheDocument()
    await user.click(await within(await meetingSection()).findByRole('button', { name: 'File the record' }))
    await user.dblClick(within(screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })).getByRole('button', { name: 'Confirm' }))
    const slip = await conversation().findByRole('article', { name: 'Filed the record of the Johnson annual review' })
    expect(slip).toHaveTextContent('REC-0001')
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('act-REC-0001')))
    expect(conversation().getByRole('article', { name: 'Tasks from the filed record' })).toBeInTheDocument()
    const tasks = within(await meetingSection()).getByRole('table', { name: 'Follow-up tasks' })
    expect(within(tasks).getAllByRole('row').filter((r) => r.querySelector('td'))).toHaveLength(6)
    expect(tasks).toHaveTextContent('Mike Chen')
    expect(store().acts.filter((a) => a.kind === 'file_meeting_record')).toHaveLength(1)
  })

  it('links the meeting, the household and its clients as full views', async () => {
    await openMeetingThread()
    const views = await inContext().findByRole('region', { name: 'Full views' })
    expect(await within(views).findByRole('link', { name: /^Meeting · Johnson annual review/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(within(views).getByRole('link', { name: /^Johnson Household/ })).toHaveAttribute('href', '/households/hh-001?from=th-johnson-meeting')
    expect(within(views).getByRole('link', { name: /^Robert Johnson/ })).toHaveAttribute('href', '/clients/cli-001?from=th-johnson-meeting')
    expect(within(views).getByRole('link', { name: /^Patricia Johnson/ })).toHaveAttribute('href', '/clients/cli-002?from=th-johnson-meeting')
  })

  it("Robert's thread links his client view and the household for the firm", async () => {
    renderRoutes(routes, '/t/th-robert')
    const views = await inContext().findByRole('region', { name: 'Full views' })
    expect(await within(views).findByRole('link', { name: /^Robert Johnson/ })).toHaveAttribute('href', '/clients/cli-001?from=th-robert')
    expect(within(views).getByRole('link', { name: /^Johnson Household/ })).toHaveAttribute('href', '/households/hh-001?from=th-robert')
  })

  it('Sarah reads the meeting and its agenda, and runs nothing', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    sessionStorage.setItem('ws-viewer', 'user-002')
    const panel = await openMeetingThread()
    expect(await within(panel).findByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    expect(panel).toHaveTextContent('Only the advisor runs the meeting: prep, the agenda, holding it and its notes.')
    expect(within(panel).queryByRole('button')).toBeNull()
  })

  it('Robert is told the meeting thread does not exist', async () => {
    await holdMeeting(ADRIAN, 'evt-010')
    await draftMeetingNotes(ADRIAN, 'evt-010')
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/t/th-johnson-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Thread not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/transcript|Meeting Notes|agenda/i)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/workspace/__tests__/carry-targets.test.ts src/workspace/__tests__/meeting-thread.test.tsx --testTimeout 30000`
Expected: FAIL — no meeting panel, no carry target, `FullViews` takes an account id.

- [ ] **Step 3: Where a finding can be carried**

Create `src/workspace/thread/carry-targets.ts`:

```ts
import type { Subject, Thread } from '@/types/workspace'

export type CarryTarget = { thread: Thread; label: string }

/**
 * The team threads a Brief finding can go to: the one about the same subject, and the meeting thread of
 * the household that holds the Brief's account. Only threads the viewer is a member of.
 */
export function carryTargets(threads: readonly Thread[], viewerId: string, subject: Subject | undefined, householdId: string | undefined): CarryTarget[] {
  if (!subject) return []
  const mine = threads.filter((t) => t.visibility === 'internal' && t.memberIds.includes(viewerId))
  const team = mine.filter((t) => t.subject?.type === subject.type && t.subject.id === subject.id).map((thread) => ({ thread, label: 'Take to team thread' }))
  const meetings = householdId === undefined ? []
    : mine.filter((t) => t.subject?.type === 'household' && t.subject.id === householdId).map((thread) => ({ thread, label: `Take to ${thread.title}` }))
  return [...team, ...meetings]
}
```

Replace `src/workspace/thread/CarryControl.tsx` with:

```tsx
import { useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useAccount } from '@/hooks/use-accounts'
import { useCarryFinding, useThreads } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Thread } from '@/types/workspace'
import { carryTargets } from './carry-targets'

/** "Take to …": the brief's owner sends a finding to a team thread about the same subject, or to its household's meeting thread. */
export function CarryControl({ thread, findingId }: { thread: Thread; findingId: string }) {
  const { viewerId } = useViewer()
  const threads = useThreads()
  const carry = useCarryFinding(thread.id)
  const [taken, setTaken] = useState<string>()
  const subject = thread.subject
  const account = useAccount(subject?.type === 'account' ? subject.id : '')
  const targets = carryTargets(threads.data ?? [], viewerId, subject, account.data?.householdId)
  if (thread.ownerId !== viewerId || targets.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      {targets.map(({ thread: target, label }) => (
        <Button key={target.id} rank="secondary" disabled={carry.isPending}
          onClick={() => carry.mutate({ messageId: findingId, toThreadId: target.id }, { onSuccess: () => setTaken(target.title) })}>
          {label}
        </Button>
      ))}
      {taken ? <p role="status" className="text-body text-ink-2">{`Taken to ${taken}.`}</p> : null}
      {carry.isError ? <p role="alert" className="text-body">{carry.error.message}</p> : null}
    </div>
  )
}
```

- [ ] **Step 4: Full views by subject**

Replace `src/workspace/context/FullViews.tsx` with:

```tsx
import { Link } from 'react-router-dom'
import { useAccount } from '@/hooks/use-accounts'
import { useClientView, useHousehold } from '@/hooks/use-meetings'
import { accountFullViewHref, clientFullViewHref, householdFullViewHref, meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import type { Subject } from '@/types/workspace'
import { ContextSection } from './ContextSection'

const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

function FullViewLink({ to, children }: { to: string; children: string }) {
  return <Link to={to} className={LINK}>{`${children} `}<span aria-hidden="true">↗</span></Link>
}

/** The full views the thread's subject opens: its account; or its household, the household's clients and meetings; or its client and their household. */
export function FullViews({ subject, threadId }: { subject: Subject; threadId: string }) {
  switch (subject.type) {
    case 'account': return <AccountViews accountId={subject.id} threadId={threadId} />
    case 'household': return <HouseholdViews householdId={subject.id} threadId={threadId} />
    case 'client': return <ClientViews clientId={subject.id} threadId={threadId} />
    default: return null
  }
}

function AccountViews({ accountId, threadId }: { accountId: string; threadId: string }) {
  const account = useAccount(accountId)
  return (
    <ContextSection title="Full views">
      {account.isPending ? <p role="status" className="text-body text-ink-3">Loading the account…</p>
        : account.isError ? <p role="alert" className="text-body">{account.error.message}</p>
        : <FullViewLink to={accountFullViewHref(accountId, threadId)}>{account.data.name}</FullViewLink>}
    </ContextSection>
  )
}

function HouseholdViews({ householdId, threadId }: { householdId: string; threadId: string }) {
  const household = useHousehold(householdId)
  return (
    <ContextSection title="Full views">
      {household.isPending ? <p role="status" className="text-body text-ink-3">Loading the household…</p>
        : household.isError ? <p role="alert" className="text-body">{household.error.message}</p>
        : (
          <div className="flex flex-col gap-2">
            {[...household.data.meetings.upcoming, ...household.data.meetings.past].filter((m) => m.threadId !== undefined).map((m) => (
              <FullViewLink key={m.eventId} to={meetingFullViewHref(m.eventId, threadId)}>{`Meeting · ${m.title}`}</FullViewLink>
            ))}
            <FullViewLink to={householdFullViewHref(householdId, threadId)}>{household.data.name}</FullViewLink>
            {household.data.members.map((m) => <FullViewLink key={m.clientId} to={clientFullViewHref(m.clientId, threadId)}>{m.name}</FullViewLink>)}
          </div>
        )}
    </ContextSection>
  )
}

function ClientViews({ clientId, threadId }: { clientId: string; threadId: string }) {
  const client = useClientView(clientId)
  return (
    <ContextSection title="Full views">
      {client.isPending ? <p role="status" className="text-body text-ink-3">Loading the client…</p>
        : client.isError ? <p role="alert" className="text-body">{client.error.message}</p>
        : (
          <div className="flex flex-col gap-2">
            <FullViewLink to={clientFullViewHref(clientId, threadId)}>{client.data.name}</FullViewLink>
            <FullViewLink to={householdFullViewHref(client.data.householdId, threadId)}>{client.data.householdName}</FullViewLink>
          </div>
        )}
    </ContextSection>
  )
}
```

- [ ] **Step 5: The meeting panel**

Create `src/workspace/context/MeetingPanel.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Tag } from '@/kit/tag/Tag'
import { fmtDate, fmtEasternRange } from '@/kit/measure'
import { useMeeting, useMeetings } from '@/hooks/use-meetings'
import { useThread } from '@/hooks/use-workspace'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import { MeetingControls } from '@/workspace/meeting/MeetingControls'
import { AgendaEditor } from '@/workspace/meeting/AgendaEditor'
import { TaskTable } from '@/workspace/meeting/TaskTable'
import { agendaFindings } from '@/workspace/meeting/agenda-findings'
import { MEETING_STATE_TAG } from '@/workspace/meeting/meeting-words'
import type { Directory, Thread } from '@/types/workspace'
import { ContextSection } from './ContextSection'

type MeetingPanelProps = { thread: Thread; directory: Directory; onRecorded: (actId: string) => void }

/** The meeting a team thread is for, if any: when and where, its state, the advisor's next step, the agenda, and once filed, the tasks. */
export function MeetingPanel({ thread, directory, onRecorded }: MeetingPanelProps) {
  const meetings = useMeetings()
  if (meetings.isPending) return null
  if (meetings.isError) return <p role="alert" className="py-5 text-body">{meetings.error.message}</p>
  const summary = meetings.data.find((m) => m.threadId === thread.id)
  return summary ? <MeetingSection eventId={summary.eventId} thread={thread} directory={directory} onRecorded={onRecorded} /> : null
}

function MeetingSection({ eventId, thread, directory, onRecorded }: MeetingPanelProps & { eventId: string }) {
  const { viewerId } = useViewer()
  const meeting = useMeeting(eventId)
  const detail = useThread(thread.id)
  if (meeting.isPending) return <p role="status" className="py-5 text-body text-ink-3">Loading the meeting…</p>
  if (meeting.isError) return <p role="alert" className="py-5 text-body">{meeting.error.message}</p>
  const m = meeting.data
  const canPrepare = (directory.permissions[viewerId] ?? []).includes('prepare_meeting')
  return (
    <ContextSection title="Meeting">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-body font-semibold">{m.event.title}</span>
          <Tag tone={m.state === 'filed' ? 'solid' : 'outline'}>{MEETING_STATE_TAG[m.state]}</Tag>
        </div>
        <span className="tabular text-body text-ink-2">{[fmtDate(m.start), fmtEasternRange(m.start, m.end), ...(m.event.location ? [m.event.location] : [])].join(' · ')}</span>
      </div>
      <Link to={meetingFullViewHref(m.eventId, thread.id)} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">
        Open the meeting view <span aria-hidden="true">↗</span>
      </Link>
      <MeetingControls meeting={m} canPrepare={canPrepare} onRecorded={onRecorded} />
      <h3 className="text-label uppercase text-ink-3">Agenda</h3>
      <AgendaEditor meeting={m} findings={agendaFindings(detail.data?.messages ?? [])} editable={canPrepare && m.state === 'scheduled'} />
      {m.state === 'filed' ? <TaskTable caption="Follow-up tasks" tasks={m.tasks} directory={directory} /> : null}
    </ContextSection>
  )
}
```

In `src/workspace/context/ContextColumn.tsx`:

- import `MeetingPanel` from `./MeetingPanel`;
- replace `const accountId = t.subject?.type === 'account' ? t.subject.id : undefined` with `const subject = t.subject`;
- after the `ApprovalPanel` line, add `{t.visibility === 'internal' && !viewerIsClient ? <MeetingPanel thread={t} directory={dir} onRecorded={setSentActId} /> : null}`;
- the last line becomes `{subject && !viewerIsClient ? <FullViews subject={subject} threadId={t.id} /> : null}`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/carry-targets.test.ts src/workspace/__tests__/meeting-thread.test.tsx src/workspace/__tests__/brief-thread.test.tsx src/workspace/__tests__/context.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 8: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/workspace/context/MeetingPanel.tsx src/workspace/context/ContextColumn.tsx src/workspace/context/FullViews.tsx \
  src/workspace/thread/carry-targets.ts src/workspace/thread/CarryControl.tsx \
  src/workspace/__tests__/carry-targets.test.ts src/workspace/__tests__/meeting-thread.test.tsx
git commit -m "feat(meetings): the meeting thread's context panel; the Brief's line and carry; full views by subject"
```

---
### Task 12: The meeting full view, beside the live thread

`/meetings/:eventId?from=<threadId>` takes the main pane, workbench-style: the thread list steps aside and the meeting thread is live in the right column. The page states when, where, who and the state; the advisor's controls; the agenda; once held, the transcript beside the notes draft — hovering or focusing a citation highlights its transcript line — with edits and **File the record** (the same act as the context column); the household summary. Firm only: a client is told the meeting is not found.

**Files:**
- Create: `src/workspace/thread/LiveThreadFeed.tsx`, `src/workspace/meeting/MeetingPage.tsx`, `src/workspace/meeting/MeetingThreadColumn.tsx`, `src/workspace/meeting/use-meeting-thread-available.ts`, `src/workspace/meeting/TranscriptNotes.tsx`, `src/workspace/meeting/NotesEditor.tsx`, `src/workspace/meeting/note-words.ts`
- Modify: `src/workspace/workbench/WorkbenchThreadColumn.tsx` (use `LiveThreadFeed`), `src/app/routes.tsx`
- Test: `src/workspace/__tests__/meeting-view.test.tsx` (new)

**Interfaces:**
- Consumes: `useMeeting`, `useHousehold`, `useSaveMeetingNotes` (Task 9); `MeetingControls`, `AgendaEditor`, `agendaFindings`, `TaskTable`, `MEETING_STATE_TAG`, `HouseholdSummaryPanes` (Tasks 2, 10); `useDirectory`, `useThread`; `isNotFound`; `authorName`; `PAGE_TITLE_ID`; `useFocusAfter`; `joinWords`.
- Produces:

```ts
// src/workspace/thread/LiveThreadFeed.tsx
export function LiveThreadFeed(props: { threadId: string }): JSX.Element    // the workbench's live thread, shared
// src/workspace/meeting/MeetingPage.tsx
export function MeetingPage(): JSX.Element
// src/workspace/meeting/MeetingThreadColumn.tsx
export function MeetingThreadColumn(): JSX.Element | null
// src/workspace/meeting/use-meeting-thread-available.ts
export function useMeetingThreadAvailable(): boolean
// src/workspace/meeting/note-words.ts
export const NOTE_SECTION_TITLE: Readonly<Record<NoteSection, string>>     // Discussion / Decisions / Client requests / Follow-ups
export const FILED_RECORD_ID = 'meeting-filed-record'
export const SAVE_BEFORE_FILING = 'Save your edits before filing.'
// src/workspace/meeting/NotesEditor.tsx
export function NotesEditor(props: { meeting: MeetingView; directory: Directory; editable: boolean; onCite: (lineId: string | undefined) => void; onDirtyChange: (dirty: boolean) => void; speakerOf: (id: TranscriptSpeaker) => string }): JSX.Element
// src/workspace/meeting/TranscriptNotes.tsx
export function TranscriptNotes(props: { meeting: MeetingView; directory: Directory; editable: boolean; onDirtyChange: (dirty: boolean) => void }): JSX.Element
```

- [ ] **Step 1: Write the failing test**

Create `src/workspace/__tests__/meeting-view.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { draftMeetingNotes, holdMeeting, runMeetingPrep } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const PATH = '/meetings/evt-010?from=th-johnson-meeting'
const liveThread = () => screen.getByRole('complementary', { name: 'Live thread' })
const transcriptLine = (id: string) => document.getElementById(`transcript-${id}`)

async function openMeeting(path = PATH) {
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: 'Johnson annual review' })
  return view
}
async function heldWithNotes() {
  await runMeetingPrep(ADRIAN, 'evt-010')
  await holdMeeting(ADRIAN, 'evt-010')
  await draftMeetingNotes(ADRIAN, 'evt-010')
}

describe('the meeting full view', () => {
  afterEach(() => sessionStorage.clear())

  it('takes the main pane beside the live meeting thread; before the meeting: when, who, the agenda and the household', async () => {
    await runMeetingPrep(ADRIAN, 'evt-010')
    await openMeeting()
    expect(screen.queryByRole('navigation', { name: 'Threads' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent('2026-02-25 · 14:00–15:15 ET · Office — Main')
    expect(main).toHaveTextContent('With Robert Johnson, Patricia Johnson and Adrian Hale')
    expect(main).toHaveTextContent('SCHEDULED')
    expect(main).toHaveTextContent("Firm only · client can't see")
    expect(within(main).getByRole('list', { name: 'Agenda · v1' })).toBeInTheDocument()
    expect(await within(main).findByRole('table', { name: 'Household accounts' })).toBeInTheDocument()
    expect(within(main).queryByRole('list', { name: 'Transcript' })).toBeNull()
    expect(await within(liveThread()).findByRole('list', { name: 'Thread feed' })).toHaveTextContent('Agenda v1 · Proposed an agenda ordered by what needs attention first.')
  })

  it('holding from here moves the meeting on; the transcript arrives beside the notes', async () => {
    await openMeeting()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Hold the meeting' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Hold the meeting?' })).getByRole('button', { name: 'Hold the meeting' }))
    const transcript = await screen.findByRole('list', { name: 'Transcript' })
    expect(within(transcript).getAllByRole('listitem')).toHaveLength(25)
    expect(transcript).toHaveTextContent('Patricia Johnson')
    expect(screen.getByText('No notes yet. Ask Meeting Notes for a draft.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Draft notes' }))
    expect(await screen.findByRole('list', { name: 'Decisions' })).toBeInTheDocument()
    await waitFor(() => expect(within(liveThread()).getByRole('list', { name: 'Thread feed' })).toHaveTextContent('Drafted the notes from the transcript.'))
  })

  it('hovering or focusing a citation highlights the transcript line it cites', async () => {
    await heldWithNotes()
    await openMeeting()
    const user = userEvent.setup()
    const decisions = await screen.findByRole('list', { name: 'Decisions' })
    const cite = within(decisions).getByRole('button', { name: 'Cites t-07 · Patricia Johnson' })
    expect(transcriptLine('t-07')).not.toHaveAttribute('data-highlighted')
    await user.hover(cite)
    expect(transcriptLine('t-07')).toHaveAttribute('data-highlighted', 'true')
    await user.unhover(cite)
    expect(transcriptLine('t-07')).not.toHaveAttribute('data-highlighted')
    cite.focus()
    await waitFor(() => expect(transcriptLine('t-07')).toHaveAttribute('data-highlighted', 'true'))
  })

  it('unsaved edits block filing; saved, the record files from here, once, with its tasks', async () => {
    await heldWithNotes()
    await openMeeting()
    const user = userEvent.setup()
    const discussion = await screen.findByRole('list', { name: 'Discussion' })
    await user.click(within(discussion).getByRole('button', { name: 'Edit n-01' }))
    const field = screen.getByRole('textbox', { name: 'Edit n-01' })
    await user.clear(field)
    await user.type(field, 'Reviewed the rebalance and the Intel harvest.')
    expect(screen.getByText('Unsaved edits')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'File the record' }))
    const blocked = screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })
    expect(blocked).toHaveTextContent('Save your edits before filing.')
    expect(within(blocked).getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.click(within(blocked).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Save notes' }))
    await waitFor(() => expect(store().meetings[0]!.notesDraft![0]!.text).toBe('Reviewed the rebalance and the Intel harvest.'))
    await waitFor(() => expect(screen.queryByText('Unsaved edits')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'File the record' }))
    await user.dblClick(within(screen.getByRole('dialog', { name: 'File the record of the Johnson annual review?' })).getByRole('button', { name: 'Confirm' }))
    const filed = await screen.findByText(/^Filed · REC-0001 · fingerprint [0-9A-F]{8}$/)
    await waitFor(() => expect(document.activeElement).toBe(filed))
    expect(screen.getByRole('table', { name: 'Follow-up tasks' })).toHaveTextContent('Sarah Mitchell')
    expect(screen.queryByRole('button', { name: 'Edit n-01' })).toBeNull()
    expect(store().acts.filter((a) => a.kind === 'file_meeting_record')).toHaveLength(1)
  })

  it('follow-ups show their owner and due date', async () => {
    await heldWithNotes()
    await openMeeting()
    const followUps = await screen.findByRole('list', { name: 'Follow-ups' })
    expect(followUps).toHaveTextContent('Mike Chen · due 2026-03-02')
    expect(followUps).toHaveTextContent('Sarah Mitchell · due 2026-02-26')
  })

  it("is read-only for Mark, and not found for Robert; switching to Robert goes home", async () => {
    await heldWithNotes()
    sessionStorage.setItem('ws-viewer', 'cco-001')
    const { unmount } = await openMeeting()
    expect(await screen.findByRole('list', { name: 'Transcript' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit n-/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'File the record' })).toBeNull()
    unmount()
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, PATH)
    expect(await screen.findByRole('heading', { level: 1, name: 'Meeting not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/transcript|Johnson annual review/i)
    expect(screen.queryByRole('complementary', { name: 'Live thread' })).toBeNull()
  })

  it('switching "view as" to Robert on the meeting view goes home', async () => {
    const { router } = await openMeeting()
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/workspace/__tests__/meeting-view.test.tsx --testTimeout 30000`
Expected: FAIL — `/meetings/evt-010` is the not-found page.

- [ ] **Step 3: The live thread, shared**

Create `src/workspace/thread/LiveThreadFeed.tsx` with the `ThreadFeed` body moved out of `WorkbenchThreadColumn.tsx`, exported under its new name:

```tsx
import { Link } from 'react-router-dom'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { useDirectory, useThread } from '@/hooks/use-workspace'
import { Composer } from '@/workspace/thread/Composer'
import { CompactMessage } from '@/workspace/workbench/CompactMessage'

/** A team thread, live beside a full view: the same queries as the thread page, so both update together. */
export function LiveThreadFeed({ threadId }: { threadId: string }) {
  const thread = useThread(threadId)
  const directory = useDirectory()
  if (thread.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (thread.isError) return <p role="alert" className="text-body">{thread.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  const { thread: t, messages } = thread.data
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-body font-semibold">{t.title}</span>
        <Link to={`/t/${encodeURIComponent(t.id)}`} className="text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Open the thread</Link>
      </div>
      <VisibilityBand visibility={t.visibility} scale="message" />
      <ol aria-label="Thread feed" className="flex min-w-0 flex-col">
        {messages.map((m) => (
          <li key={m.id} className="min-w-0 border-b border-rule py-3 first:pt-0 last:border-b-0">
            <CompactMessage message={m} directory={directory.data} />
          </li>
        ))}
      </ol>
      <Composer thread={t} directory={directory.data} />
    </div>
  )
}
```

and replace `src/workspace/workbench/WorkbenchThreadColumn.tsx` with:

```tsx
import { useParams } from 'react-router-dom'
import { useProposal } from '@/hooks/use-workspace'
import { LiveThreadFeed } from '@/workspace/thread/LiveThreadFeed'

/** The proposal's team thread, live beside the workbench. */
export function WorkbenchThreadColumn() {
  const { proposalId } = useParams()
  if (!proposalId) throw new Error('The workbench needs a proposal id')
  const proposal = useProposal(proposalId)
  if (proposal.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (proposal.isError) return null
  return <LiveThreadFeed threadId={proposal.data.threadId} />
}
```

Create `src/workspace/meeting/MeetingThreadColumn.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { useMeeting } from '@/hooks/use-meetings'
import { LiveThreadFeed } from '@/workspace/thread/LiveThreadFeed'

/** The meeting thread, live beside the meeting view. */
export function MeetingThreadColumn() {
  const { eventId } = useParams()
  if (!eventId) throw new Error('The meeting view needs an event id')
  const meeting = useMeeting(eventId)
  if (meeting.isPending) return <p role="status" className="text-body text-ink-3">Loading the thread…</p>
  if (meeting.isError) return null
  return <LiveThreadFeed threadId={meeting.data.threadId} />
}
```

Create `src/workspace/meeting/use-meeting-thread-available.ts`:

```ts
import { useParams } from 'react-router-dom'
import { useMeeting } from '@/hooks/use-meetings'
import { useDirectory } from '@/hooks/use-workspace'

/** The live thread shows only while the meeting is readable; the page itself reports why not. */
export function useMeetingThreadAvailable(): boolean {
  const { eventId } = useParams()
  if (!eventId) throw new Error('The meeting view needs an event id')
  const meeting = useMeeting(eventId)
  const directory = useDirectory()
  return !meeting.isError && !directory.isError
}
```

- [ ] **Step 4: The notes beside the transcript**

Create `src/workspace/meeting/note-words.ts`:

```ts
import type { NoteSection } from '@/types/workspace-meeting'

export const NOTE_SECTION_TITLE: Readonly<Record<NoteSection, string>> = {
  discussion: 'Discussion', decisions: 'Decisions', client_requests: 'Client requests', follow_ups: 'Follow-ups',
}

export const FILED_RECORD_ID = 'meeting-filed-record'
export const SAVE_BEFORE_FILING = 'Save your edits before filing.'
```

Create `src/workspace/meeting/NotesEditor.tsx`:

```tsx
import { useEffect, useId, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Pane } from '@/kit/layout/Pane'
import { TextInput } from '@/kit/text-input/TextInput'
import { fmtDate } from '@/kit/measure'
import { useSaveMeetingNotes } from '@/hooks/use-meetings'
import { authorName } from '@/workspace/proposal/author-name'
import { NOTE_SECTIONS, type MeetingView, type NoteLine, type NoteSection, type TranscriptSpeaker } from '@/types/workspace-meeting'
import type { Directory } from '@/types/workspace'
import { FILED_RECORD_ID, NOTE_SECTION_TITLE } from './note-words'

type NotesEditorProps = {
  meeting: MeetingView; directory: Directory; editable: boolean
  onCite: (lineId: string | undefined) => void; onDirtyChange: (dirty: boolean) => void; speakerOf: (id: TranscriptSpeaker) => string
}

const comparable = (lines: readonly NoteLine[]) => JSON.stringify(lines.map((l) => ({ ...l, text: l.text.trim() })))

/** The notes draft (or the filed record), by section, each line with its citations; editable until filed. Saving sends the whole draft. */
export function NotesEditor({ meeting, directory, editable, onCite, onDirtyChange, speakerOf }: NotesEditorProps) {
  const source = meeting.filed?.lines ?? meeting.notesDraft
  const [lines, setLines] = useState<NoteLine[]>(source ?? [])
  const [editing, setEditing] = useState<string>()
  const save = useSaveMeetingNotes(meeting.eventId)
  const dirty = source !== undefined && comparable(lines) !== comparable(source)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])
  if (!source) return <Pane title="Notes"><p className="text-body text-ink-3">No notes yet. Ask Meeting Notes for a draft.</p></Pane>
  const spoken = new Map((meeting.transcript ?? []).map((l) => [l.id, l.speaker]))
  const speakerFor = (cite: string) => {
    const speaker = spoken.get(cite)
    if (!speaker) throw new Error(`Note cites ${cite}, which the transcript does not have`)
    return speakerOf(speaker)
  }
  const setText = (id: string, text: string) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, text } : l)))
  return (
    <Pane title="Notes" meta={meeting.filed ? 'Filed record' : 'Draft · Meeting Notes'}>
      {meeting.filed ? (
        <p id={FILED_RECORD_ID} tabIndex={-1} className="tabular text-body font-semibold">{`Filed · ${meeting.filed.actId} · fingerprint ${meeting.filed.fingerprint}`}</p>
      ) : null}
      {NOTE_SECTIONS.map((section) => (
        <NoteSectionList key={section} section={section} lines={lines.filter((l) => l.section === section)} directory={directory} editable={editable}
          editing={editing} onEdit={(id) => setEditing((current) => (current === id ? undefined : id))} onText={setText}
          onRemove={(id) => setLines((ls) => ls.filter((l) => l.id !== id))} canRemove={lines.length > 1} onCite={onCite} speakerFor={speakerFor} />
      ))}
      {editable ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button rank="secondary" disabled={!dirty || save.isPending}
            onClick={() => save.mutate(lines.map(({ id, section, text, cites, owner, due }) => ({ id, section, text, cites, ...(owner ? { owner } : {}), ...(due ? { due } : {}) })),
              { onSuccess: () => setEditing(undefined) })}>Save notes</Button>
          {dirty ? <span className="text-label text-ink-3">Unsaved edits</span> : null}
        </div>
      ) : null}
      {save.isError ? <p role="alert" className="text-body">{save.error.message}</p> : null}
    </Pane>
  )
}

type NoteSectionListProps = {
  section: NoteSection; lines: NoteLine[]; directory: Directory; editable: boolean; editing: string | undefined
  onEdit: (id: string) => void; onText: (id: string, text: string) => void; onRemove: (id: string) => void; canRemove: boolean
  onCite: (lineId: string | undefined) => void; speakerFor: (cite: string) => string
}

function NoteSectionList({ section, lines, directory, editable, editing, onEdit, onText, onRemove, canRemove, onCite, speakerFor }: NoteSectionListProps) {
  const titleId = useId()
  if (lines.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <h3 id={titleId} className="text-label uppercase text-ink-3">{NOTE_SECTION_TITLE[section]}</h3>
      <ul aria-label={NOTE_SECTION_TITLE[section]} className="flex flex-col">
        {lines.map((line) => (
          <li key={line.id} className="flex min-w-0 flex-col gap-1.5 border-b border-rule py-2 last:border-b-0">
            {editing === line.id
              ? <TextInput label={`Edit ${line.id}`} value={line.text} rows={3} onChange={(text) => onText(line.id, text)} />
              : <p className="text-copy">{line.text}</p>}
            {line.owner && line.due ? <p className="text-label text-ink-2">{`${authorName(line.owner, directory)} · due ${fmtDate(line.due)}`}</p> : null}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-label uppercase text-ink-3">Cites</span>
              {line.cites.map((cite) => (
                <Button key={cite} rank="quiet" aria-label={`Cites ${cite} · ${speakerFor(cite)}`}
                  onMouseEnter={() => onCite(cite)} onMouseLeave={() => onCite(undefined)} onFocus={() => onCite(cite)} onBlur={() => onCite(undefined)}>
                  {cite}
                </Button>
              ))}
              {editable ? (
                <span className="ml-auto flex gap-1">
                  <Button rank="quiet" aria-label={`${editing === line.id ? 'Done editing' : 'Edit'} ${line.id}`} onClick={() => onEdit(line.id)}>{editing === line.id ? 'Done' : 'Edit'}</Button>
                  <Button rank="quiet" aria-label={`Remove ${line.id}`} disabled={!canRemove} onClick={() => onRemove(line.id)}>Remove</Button>
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Create `src/workspace/meeting/TranscriptNotes.tsx`:

```tsx
import { useState } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { cn } from '@/lib/utils'
import type { Directory } from '@/types/workspace'
import type { MeetingView, TranscriptSpeaker } from '@/types/workspace-meeting'
import { NotesEditor } from './NotesEditor'

type TranscriptNotesProps = { meeting: MeetingView; directory: Directory; editable: boolean; onDirtyChange: (dirty: boolean) => void }

/** The transcript beside the notes; a citation hovered or focused in the notes lights its transcript line. */
export function TranscriptNotes({ meeting, directory, editable, onDirtyChange }: TranscriptNotesProps) {
  const [highlighted, setHighlighted] = useState<string>()
  const transcript = meeting.transcript ?? []
  const speakerOf = (id: TranscriptSpeaker) => {
    const attendee = meeting.event.attendees.find((a) => a.id === id)
    if (!attendee) throw new Error(`Transcript speaker ${id} is not an attendee of ${meeting.eventId}`)
    return attendee.name
  }
  return (
    <div className="grid min-w-0 gap-6 split:grid-cols-2">
      <Pane title="Transcript" meta="Firm only">
        <ol aria-label="Transcript" className="flex min-w-0 flex-col">
          {transcript.map((line) => (
            <li key={line.id} id={`transcript-${line.id}`} data-highlighted={highlighted === line.id ? 'true' : undefined}
              className={cn('flex min-w-0 flex-col gap-0.5 border-l-2 py-2 pl-3', highlighted === line.id ? 'border-ink bg-face' : 'border-transparent')}>
              <span className="flex items-baseline gap-2 text-label">
                <span className="tabular text-ink-3">{line.id}</span>
                <span className="font-semibold uppercase text-ink-2">{speakerOf(line.speaker)}</span>
              </span>
              <span className="text-copy">{line.text}</span>
            </li>
          ))}
        </ol>
      </Pane>
      <NotesEditor key={meeting.filed?.actId ?? meeting.notesFingerprint ?? 'no-notes'} meeting={meeting} directory={directory} editable={editable}
        onCite={setHighlighted} onDirtyChange={onDirtyChange} speakerOf={speakerOf} />
    </div>
  )
}
```

- [ ] **Step 5: The page and its route**

Create `src/workspace/meeting/MeetingPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useFocusAfter } from '@/kit/keyboard/use-focus-after'
import { fmtDate, fmtEasternRange } from '@/kit/measure'
import { useHousehold, useMeeting } from '@/hooks/use-meetings'
import { useDirectory, useThread } from '@/hooks/use-workspace'
import { isNotFound } from '@/workspace/is-not-found'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { HouseholdSummaryPanes } from '@/workspace/household/HouseholdSummaryPanes'
import { joinWords } from '@/lib/words'
import type { Directory } from '@/types/workspace'
import type { MeetingView } from '@/types/workspace-meeting'
import { AgendaEditor } from './AgendaEditor'
import { MeetingControls } from './MeetingControls'
import { TaskTable } from './TaskTable'
import { TranscriptNotes } from './TranscriptNotes'
import { agendaFindings } from './agenda-findings'
import { MEETING_STATE_TAG } from './meeting-words'
import { FILED_RECORD_ID, SAVE_BEFORE_FILING } from './note-words'

export function MeetingPage() {
  const { eventId } = useParams()
  if (!eventId) throw new Error('The meeting route needs an event id')
  return <MeetingGate key={eventId} eventId={eventId} />
}

/** Firm-only: a client is told the meeting is not found, and a switch to someone who cannot see it goes home. */
function MeetingGate({ eventId }: { eventId: string }) {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const meeting = useMeeting(eventId)
  const directory = useDirectory()
  const hiddenFromNewViewer = viewerId !== openedAs && meeting.isError && isNotFound(meeting.error)
  useEffect(() => {
    if (hiddenFromNewViewer) navigate('/', { replace: true })
  }, [hiddenFromNewViewer, navigate])

  if (hiddenFromNewViewer || meeting.isPending || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the meeting…</p>
  if (meeting.isError) return isNotFound(meeting.error) ? <MeetingNotFound /> : <p role="alert" className="text-body">{meeting.error.message}</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  return <MeetingFullView meeting={meeting.data} directory={directory.data} />
}

function MeetingFullView({ meeting, directory }: { meeting: MeetingView; directory: Directory }) {
  const [params] = useSearchParams()
  const from = params.get('from')
  const { viewerId } = useViewer()
  const focusAfter = useFocusAfter()
  const household = useHousehold(meeting.householdId)
  const thread = useThread(meeting.threadId)
  const [dirty, setDirty] = useState(false)
  const [recordedActId, setRecordedActId] = useState<string>()
  const filedActId = meeting.filed?.actId
  // Focus moves to the filed record once the refreshed meeting has put it on screen.
  useEffect(() => {
    if (recordedActId !== undefined && filedActId === recordedActId) focusAfter(FILED_RECORD_ID)
  }, [recordedActId, filedActId, focusAfter])
  const canPrepare = (directory.permissions[viewerId] ?? []).includes('prepare_meeting')
  const current = meeting.agenda[meeting.agenda.length - 1]
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" />
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{meeting.title}</h1>
          <Tag tone={meeting.state === 'filed' ? 'solid' : 'outline'}>{MEETING_STATE_TAG[meeting.state]}</Tag>
        </div>
        <p className="tabular text-body text-ink-2">{[fmtDate(meeting.start), fmtEasternRange(meeting.start, meeting.end), ...(meeting.event.location ? [meeting.event.location] : [])].join(' · ')}</p>
        <p className="text-body text-ink-2">{`With ${joinWords(meeting.event.attendees.map((a) => a.name))}`}</p>
      </header>
      <MeetingControls meeting={meeting} canPrepare={canPrepare} onRecorded={setRecordedActId}
        filingBlockedReason={dirty ? SAVE_BEFORE_FILING : undefined} />
      {meeting.transcript ? <TranscriptNotes meeting={meeting} directory={directory} editable={canPrepare && meeting.state === 'held'} onDirtyChange={setDirty} /> : null}
      {meeting.state === 'filed' ? (
        <Pane title="Follow-up tasks"><TaskTable caption="Follow-up tasks" tasks={meeting.tasks} directory={directory} /></Pane>
      ) : null}
      <Pane title="Agenda" meta={current ? `v${current.n}` : undefined}>
        <AgendaEditor meeting={meeting} findings={agendaFindings(thread.data?.messages ?? [])} editable={canPrepare && meeting.state === 'scheduled'} />
      </Pane>
      {household.isPending ? <p role="status" className="text-body text-ink-3">Loading the household…</p>
        : household.isError ? <p role="alert" className="text-body">{household.error.message}</p>
        : <HouseholdSummaryPanes summary={household.data} />}
    </div>
  )
}

function MeetingNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Meeting not found</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
```

In `src/app/routes.tsx`, import `MeetingPage`, `MeetingThreadColumn` and `useMeetingThreadAvailable`, add the handle

```tsx
const meetingHandle: ShellHandle = {
  contextColumn: { label: 'Live thread', Content: MeetingThreadColumn, useAvailable: useMeetingThreadAvailable },
  threadList: 'hidden',
}
```

and the route `{ path: 'meetings/:eventId', element: <MeetingPage />, handle: meetingHandle },` after the `proposals/:proposalId` route.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/meeting-view.test.tsx src/workspace/__tests__/workbench-layout.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 7: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 8: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/workspace/thread/LiveThreadFeed.tsx src/workspace/workbench/WorkbenchThreadColumn.tsx src/workspace/meeting/MeetingPage.tsx \
  src/workspace/meeting/MeetingThreadColumn.tsx src/workspace/meeting/use-meeting-thread-available.ts src/workspace/meeting/TranscriptNotes.tsx \
  src/workspace/meeting/NotesEditor.tsx src/workspace/meeting/note-words.ts src/app/routes.tsx src/workspace/__tests__/meeting-view.test.tsx
git commit -m "feat(meetings): the meeting full view beside the live thread; transcript beside the notes, citations highlighted"
```

---
### Task 13: The household and client full views, and the command line

`/households/:householdId` carries the household summary plus documents, recent communications, activity and meetings past and upcoming; `/clients/:clientId` carries the profile, the risk assessment and its date, the accounts owned, the IPS and communications. Both are firm only (a client is told "not found"; a switch to a client goes home). The command line offers "Household · Johnson", "Client · Robert Johnson", "Client · Patricia Johnson" and "Meeting · Johnson annual review" to firm viewers only.

**Files:**
- Create: `src/workspace/full-views/HouseholdView.tsx`, `src/workspace/full-views/ClientView.tsx`, `src/workspace/household/CommunicationsList.tsx`
- Modify: `src/workspace/household/household-words.ts`, `src/app/routes.tsx`, `src/app/use-destinations.ts`
- Test: `src/workspace/__tests__/household-client-views.test.tsx` (new), `src/workspace/__tests__/shell-keyboard.test.tsx`

**Interfaces:**
- Consumes: `useHousehold`, `useClientView`, `useMeetings` (Task 9); `getHousehold` from `@/services/workspace`; `HouseholdSummaryPanes`, `AccountsTable`, `GOAL_STATUS_TAG` (Task 10); `MEETING_STATE_TAG`; the full-view hrefs (Task 2).
- Produces:

```ts
// src/workspace/full-views/HouseholdView.tsx
export function HouseholdView(): JSX.Element
// src/workspace/full-views/ClientView.tsx
export function ClientView(): JSX.Element
// src/workspace/household/CommunicationsList.tsx
export function CommunicationsList(props: { communications: CommunicationRow[] }): JSX.Element
// src/workspace/household/household-words.ts (added)
export const DOCUMENT_TYPE_WORDS: Readonly<Record<DocumentType, string>>
export const SIGNATURE_WORDS: Readonly<Record<SignatureStatus, string>>
export const CHANNEL_WORDS: Readonly<Record<CommChannel, string>>
```

- [ ] **Step 1: Write the failing tests**

Create `src/workspace/__tests__/household-client-views.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { holdMeeting } from '@/services/workspace'

const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

describe('the household full view', () => {
  afterEach(() => sessionStorage.clear())

  it('carries the summary, the meetings, the documents, the communications and the activity', async () => {
    renderRoutes(routes, '/households/hh-001?from=th-johnson-meeting')
    expect(await screen.findByRole('heading', { level: 1, name: 'Johnson Household' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the thread' })).toHaveAttribute('href', '/t/th-johnson-meeting')
    expect(screen.getByRole('main')).toHaveTextContent("Firm only · client can't see")
    expect(screen.getByRole('link', { name: 'Patricia Johnson' })).toHaveAttribute('href', '/clients/cli-002?from=th-johnson-meeting')
    expect(screen.getByRole('table', { name: 'Household accounts' })).toBeInTheDocument()
    const upcoming = screen.getByRole('list', { name: 'Upcoming meetings' })
    expect(upcoming).toHaveTextContent('Johnson annual review · 2026-02-25 · 14:00–15:15 ET')
    expect(within(upcoming).getByRole('link', { name: /Open the meeting view/ })).toHaveAttribute('href', '/meetings/evt-010?from=th-johnson-meeting')
    expect(screen.getByRole('table', { name: 'Documents' })).toHaveTextContent('Johnson Family Trust — IPS')
    expect(screen.getByRole('list', { name: 'Communications' })).toHaveTextContent('Estate Planning Review')
    expect(screen.getByRole('list', { name: 'Activity' })).toHaveTextContent('Trade executed')
  })

  it('lists the annual review under past meetings once it is held', async () => {
    await holdMeeting('user-001', 'evt-010')
    renderRoutes(routes, '/households/hh-001')
    const past = await screen.findByRole('list', { name: 'Past meetings' })
    expect(past).toHaveTextContent('Johnson annual review')
    expect(past).toHaveTextContent('HELD')
  })

  it('is not found for Robert and for an unknown household; a switch to Robert goes home', async () => {
    viewAsOnLoad('cli-001')
    const { unmount } = renderRoutes(routes, '/households/hh-001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Household not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Vanguard')
    unmount()
    sessionStorage.clear()
    const second = renderRoutes(routes, '/households/hh-999')
    expect(await screen.findByRole('heading', { level: 1, name: 'Household not found' })).toBeInTheDocument()
    second.unmount()
    const { router } = renderRoutes(routes, '/households/hh-001')
    await screen.findByRole('heading', { level: 1, name: 'Johnson Household' })
    await screen.findByRole('option', { name: 'Robert Johnson · Client' })
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'View as' }), 'Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('the client full view', () => {
  afterEach(() => sessionStorage.clear())

  it("carries Patricia's profile, risk assessment and its date, her accounts, the IPS and her communications", async () => {
    renderRoutes(routes, '/clients/cli-002')
    expect(await screen.findByRole('heading', { level: 1, name: 'Patricia Johnson' })).toBeInTheDocument()
    const main = screen.getByRole('main')
    expect(main).toHaveTextContent('1960-07-11')
    expect(main).toHaveTextContent('Retired')
    expect(main).toHaveTextContent('Conservative · score 35 of 100 · assessed 2025-09-15')
    expect(screen.getByRole('table', { name: 'Accounts owned' })).toHaveTextContent('Patricia Johnson Roth IRA')
    expect(main).toHaveTextContent('Johnson Family Trust — IPS · signed 2025-11-15')
    expect(screen.getByRole('link', { name: 'Johnson Household' })).toHaveAttribute('href', '/households/hh-001')
  })

  it('is not found for Robert, even his own', async () => {
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/clients/cli-001')
    expect(await screen.findByRole('heading', { level: 1, name: 'Client not found' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Retired CEO')
  })
})
```

In `src/workspace/__tests__/shell-keyboard.test.tsx`, replace the first test with the two below, and replace the destination list test's body:

```tsx
  it('/ then "Johnson Rebalance" and Enter opens the thread and focuses its heading', async () => {
    const { router } = await renderAt('/')
    await openCommandLine()
    await userEvent.keyboard('Johnson Rebalance{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/t/th-johnson-review'))
    const title = await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    await waitFor(() => expect(title).toHaveFocus())
  })

  it('/ then "Johnson", named exactly, opens the household', async () => {
    const { router } = await renderAt('/')
    const box = await openCommandLine()
    await waitFor(() => expect(destinationNames()).toContain('Household · Johnson'))
    await userEvent.type(box, 'Johnson{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/households/hh-001'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Johnson Household' })).toBeInTheDocument()
  })
```

```tsx
  it('offers every visible thread, the accounts they are about, the household and its clients, the meeting, home and the kit', async () => {
    await renderAt('/')
    await openCommandLine()
    await waitFor(() => expect(destinationNames()).toContain('Account · Robert Johnson Individual'))
    await waitFor(() => expect(destinationNames()).toContain('Client · Patricia Johnson'))
    await waitFor(() => expect(destinationNames()).toContain('Meeting · Johnson annual review'))
    expect(destinationNames()).toEqual([
      'Workspace home',
      'Thread · Brief',
      'Thread · Johnson Rebalance Review',
      'Thread · Johnson annual review',
      'Thread · Robert Johnson',
      'Account · Robert Johnson Individual',
      'Household · Johnson',
      'Client · Robert Johnson',
      'Client · Patricia Johnson',
      'Meeting · Johnson annual review',
      'Supervision',
      'Archive',
      'Component kit',
    ])
  })
```

(The test "after a switch to Robert, offers only his thread plus home" stays as it is: Robert gets no household, client or meeting destination.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/workspace/__tests__/household-client-views.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx --testTimeout 30000`
Expected: FAIL — no such routes or destinations.

- [ ] **Step 3: Words and the communications list**

Append to `src/workspace/household/household-words.ts`:

```ts
import type { DocumentType, SignatureStatus } from '@/types/document'
import type { CommChannel } from '@/types/client-comms'

export const DOCUMENT_TYPE_WORDS: Readonly<Record<DocumentType, string>> = {
  ips: 'IPS', proposal: 'Proposal', agreement: 'Agreement', statement: 'Statement', tax_report: 'Tax report',
  correspondence: 'Correspondence', compliance: 'Compliance', meeting_notes: 'Meeting notes', other: 'Other',
}
export const SIGNATURE_WORDS: Readonly<Record<SignatureStatus, string>> = { not_required: 'Not required', pending: 'Pending', signed: 'Signed', expired: 'Expired' }
export const CHANNEL_WORDS: Readonly<Record<CommChannel, string>> = { email: 'Email', phone: 'Phone', video: 'Video', in_person: 'In person', letter: 'Letter' }
```

(move the two new `import type` lines to the top of the file beside the existing one.)

Create `src/workspace/household/CommunicationsList.tsx`:

```tsx
import { fmtTimestamp } from '@/kit/measure'
import type { CommunicationRow } from '@/types/workspace-household'
import { CHANNEL_WORDS } from './household-words'

/** The CRM's record of communications, latest first, as logged. */
export function CommunicationsList({ communications }: { communications: CommunicationRow[] }) {
  if (communications.length === 0) return <p className="text-body text-ink-3">No communications on file.</p>
  return (
    <ol aria-label="Communications" className="flex min-w-0 flex-col">
      {communications.map((c) => (
        <li key={c.id} className="flex min-w-0 flex-col gap-1 border-b border-rule py-3 first:pt-0 last:border-b-0">
          <span className="flex flex-wrap items-baseline gap-x-3 text-label text-ink-3">
            <span className="uppercase">{`${CHANNEL_WORDS[c.channel]} · ${c.direction === 'inbound' ? 'from' : 'to'} ${c.clientName}`}</span>
            <span className="tabular ml-auto">{fmtTimestamp(c.at)}</span>
          </span>
          <span className="text-body font-semibold">{c.subject}</span>
          <span className="text-copy text-ink-2">{c.summary}</span>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 4: The household view**

Create `src/workspace/full-views/HouseholdView.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Tag } from '@/kit/tag/Tag'
import { DataTable } from '@/kit/data-table/DataTable'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { fmtDate, fmtEasternRange, fmtTimestamp } from '@/kit/measure'
import { useHousehold } from '@/hooks/use-meetings'
import { isNotFound } from '@/workspace/is-not-found'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { HouseholdSummaryPanes } from '@/workspace/household/HouseholdSummaryPanes'
import { CommunicationsList } from '@/workspace/household/CommunicationsList'
import { DOCUMENT_TYPE_WORDS, SIGNATURE_WORDS } from '@/workspace/household/household-words'
import { MEETING_STATE_TAG } from '@/workspace/meeting/meeting-words'
import type { HouseholdView as HouseholdReadModel, MeetingRef } from '@/types/workspace-household'
import { clientFullViewHref, meetingFullViewHref } from './full-view-href'

const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

export function HouseholdView() {
  const { householdId } = useParams()
  if (!householdId) throw new Error('The household route needs a household id')
  return <HouseholdGate key={householdId} householdId={householdId} />
}

/** Firm-only: a client is told the household is not found, and a switch to a client goes home. */
function HouseholdGate({ householdId }: { householdId: string }) {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const household = useHousehold(householdId)
  const hiddenFromNewViewer = viewerId !== openedAs && household.isError && isNotFound(household.error)
  useEffect(() => {
    if (hiddenFromNewViewer) navigate('/', { replace: true })
  }, [hiddenFromNewViewer, navigate])
  if (hiddenFromNewViewer || household.isPending) return <p role="status" className="text-body text-ink-3">Loading the household…</p>
  if (household.isError) return isNotFound(household.error) ? <NotFound noun="Household" /> : <p role="alert" className="text-body">{household.error.message}</p>
  return <HouseholdPage view={household.data} />
}

function HouseholdPage({ view }: { view: HouseholdReadModel }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={LINK}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{view.name}</h1>
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {view.members.map((m) => (
            <li key={m.clientId} className="text-body text-ink-2">
              <Link to={clientFullViewHref(m.clientId, from)} className={LINK}>{m.name}</Link>
              <span className="tabular">{` · born ${fmtDate(m.dateOfBirth)}`}</span>
            </li>
          ))}
        </ul>
      </header>
      <HouseholdSummaryPanes summary={view} />
      <Pane title="Meetings">
        <MeetingList label="Upcoming meetings" meetings={view.meetings.upcoming} from={from} />
        <MeetingList label="Past meetings" meetings={view.meetings.past} from={from} />
      </Pane>
      <Pane title="Documents">
        <DataTable caption="Documents" rows={view.documents} getRowId={(d) => d.id} total={view.documents.length} noun={{ singular: 'document', plural: 'documents' }}
          columns={[
            { id: 'name', header: 'Document', wrap: true, cell: (d) => d.name },
            { id: 'client', header: 'Client', cell: (d) => d.clientName },
            { id: 'type', header: 'Type', cell: (d) => DOCUMENT_TYPE_WORDS[d.type] },
            { id: 'signature', header: 'Signature', cell: (d) => SIGNATURE_WORDS[d.signatureStatus] },
            { id: 'updated', header: 'Updated', cell: (d) => fmtDate(d.updatedOn), sortValue: (d) => d.updatedOn },
          ]} />
      </Pane>
      <Pane title="Communications"><CommunicationsList communications={view.communications} /></Pane>
      <Pane title="Activity">
        {view.activity.length === 0 ? <p className="text-body text-ink-3">No activity on file.</p> : (
          <ol aria-label="Activity" className="flex min-w-0 flex-col">
            {view.activity.map((a) => (
              <li key={a.id} className="flex min-w-0 flex-col gap-1 border-b border-rule py-3 first:pt-0 last:border-b-0">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-body font-semibold">{a.title}</span>
                  <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(a.at)}</span>
                </span>
                <span className="text-copy text-ink-2">{a.description}</span>
              </li>
            ))}
          </ol>
        )}
      </Pane>
    </div>
  )
}

function MeetingList({ label, meetings, from }: { label: string; meetings: MeetingRef[]; from: string | undefined }) {
  if (meetings.length === 0) return <p className="text-body text-ink-3">{`${label}: none.`}</p>
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {meetings.map((m) => (
        <li key={m.eventId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tabular text-body">{`${m.title} · ${fmtDate(m.start)} · ${fmtEasternRange(m.start, m.end)}`}</span>
          {m.state !== 'calendar' ? <Tag>{MEETING_STATE_TAG[m.state]}</Tag> : null}
          {m.threadId ? <Link to={meetingFullViewHref(m.eventId, from ?? m.threadId)} className={LINK}>Open the meeting view <span aria-hidden="true">↗</span></Link> : null}
        </li>
      ))}
    </ul>
  )
}

function NotFound({ noun }: { noun: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{`${noun} not found`}</h1>
      <p className="text-body text-ink-2">It may not exist, or this viewer may not be able to see it.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
```

- [ ] **Step 5: The client view**

Create `src/workspace/full-views/ClientView.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { UNIT, fmtDate, fmtMoney, fmtScore } from '@/kit/measure'
import { useClientView } from '@/hooks/use-meetings'
import { isNotFound } from '@/workspace/is-not-found'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { AccountsTable } from '@/workspace/household/AccountsTable'
import { CommunicationsList } from '@/workspace/household/CommunicationsList'
import type { ClientView as ClientReadModel } from '@/types/workspace-household'
import { householdFullViewHref } from './full-view-href'

const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

export function ClientView() {
  const { clientId } = useParams()
  if (!clientId) throw new Error('The client route needs a client id')
  return <ClientGate key={clientId} clientId={clientId} />
}

/** Firm-only: a client is told the client is not found — even themself — and a switch to a client goes home. */
function ClientGate({ clientId }: { clientId: string }) {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const client = useClientView(clientId)
  const hiddenFromNewViewer = viewerId !== openedAs && client.isError && isNotFound(client.error)
  useEffect(() => {
    if (hiddenFromNewViewer) navigate('/', { replace: true })
  }, [hiddenFromNewViewer, navigate])
  if (hiddenFromNewViewer || client.isPending) return <p role="status" className="text-body text-ink-3">Loading the client…</p>
  if (client.isError) {
    return isNotFound(client.error) ? (
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Client not found</h1>
        <p className="text-body text-ink-2">They may not exist, or this viewer may not be able to see them.</p>
        <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
      </div>
    ) : <p role="alert" className="text-body">{client.error.message}</p>
  }
  return <ClientPage view={client.data} />
}

function ClientPage({ view }: { view: ClientReadModel }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={LINK}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{view.name}</h1>
        <Link to={householdFullViewHref(view.householdId, from)} className={LINK}>{view.householdName}</Link>
      </header>
      <Pane title="Profile">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body">
          <dt className="text-ink-3">Date of birth</dt><dd className="tabular">{fmtDate(view.dateOfBirth)}</dd>
          <dt className="text-ink-3">Occupation</dt><dd>{view.occupation}</dd>
          {view.preferredContact ? <><dt className="text-ink-3">Preferred contact</dt><dd>{view.preferredContact}</dd></> : null}
        </dl>
      </Pane>
      <Pane title="Risk assessment">
        <p className="tabular text-body">{`${view.risk.tolerance} · score ${fmtScore(view.risk.scoreFraction)} of 100 · assessed ${fmtDate(view.risk.assessedOn)}`}</p>
      </Pane>
      <Pane title="Accounts owned" meta={`${fmtMoney(view.accountsValue)} ${UNIT.usd}`}>
        <AccountsTable caption="Accounts owned" accounts={view.accounts} totalValue={view.accountsValue} totalLabel="Owned" />
      </Pane>
      <Pane title="Investment policy statement">
        <p className="text-body">{view.ips
          ? `${view.ips.name} · ${view.ips.signedOn ? `signed ${fmtDate(view.ips.signedOn)}` : view.ips.signatureStatus.replace('_', ' ')}`
          : 'No investment policy statement on file.'}</p>
      </Pane>
      <Pane title="Communications"><CommunicationsList communications={view.communications} /></Pane>
    </div>
  )
}
```

- [ ] **Step 6: Routes and destinations**

In `src/app/routes.tsx`, import `HouseholdView` and `ClientView` and add, after the `accounts/:accountId` route:

```tsx
          { path: 'households/:householdId', element: <HouseholdView /> },
          { path: 'clients/:clientId', element: <ClientView /> },
```

In `src/app/use-destinations.ts`:

```ts
import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAccount } from '@/services/custodian'
import { getHousehold } from '@/services/workspace'
import { useDirectory, useProposals, useThreads } from '@/hooks/use-workspace'
import { useMeetings } from '@/hooks/use-meetings'
import { proposalWorkbenchHref } from '@/workspace/proposal/proposal-href'
import { clientFullViewHref, householdFullViewHref, meetingFullViewHref } from '@/workspace/full-views/full-view-href'
import { isClientViewer } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Destination } from '@/kit/keyboard/keys'

/**
 * Where the command line can go: home, each thread the viewer can see, the accounts those threads are about, and for
 * the firm, the households they are about with their clients, each meeting, each proposal's workbench, the desk and the kit.
 */
export function useDestinations(): Destination[] {
  const navigate = useNavigate()
  const { viewerId } = useViewer()
  const directory = useDirectory().data
  const firmViewer = directory !== undefined && !isClientViewer(directory, viewerId)
  const threads = useThreads().data ?? []
  const proposals = useProposals(undefined, firmViewer).data ?? []
  const meetings = useMeetings(firmViewer).data ?? []
  const accountIds = [...new Set(threads.flatMap((t) => (t.subject?.type === 'account' ? [t.subject.id] : [])))]
  const householdIds = firmViewer ? [...new Set(threads.flatMap((t) => (t.subject?.type === 'household' ? [t.subject.id] : [])))] : []
  // Same keys as useAccount and useHousehold, so the full views reuse what the command line already fetched.
  const accounts = useQueries({ queries: accountIds.map((id) => ({ queryKey: ['account', id], queryFn: () => getAccount(id) })) })
  const households = useQueries({ queries: householdIds.map((id) => ({ queryKey: ['workspace', viewerId, 'household', id], queryFn: () => getHousehold(viewerId, id) })) })

  return [
    { id: 'home', label: 'Workspace home', aliases: ['home'], run: () => navigate('/') },
    ...threads.map((t) => ({ id: `thread-${t.id}`, label: `Thread · ${t.title}`, aliases: [], run: () => navigate(`/t/${t.id}`) })),
    ...accounts.flatMap(({ data }) => (data
      ? [{ id: `account-${data.id}`, label: `Account · ${data.name}`, aliases: [], run: () => navigate(`/accounts/${data.id}`) }]
      : [])),
    ...households.flatMap(({ data }) => (data ? [
      { id: `household-${data.id}`, label: `Household · ${data.shortName}`, aliases: ['household'], run: () => navigate(householdFullViewHref(data.id)) },
      ...data.members.map((m) => ({ id: `client-${m.clientId}`, label: `Client · ${m.name}`, aliases: ['client'], run: () => navigate(clientFullViewHref(m.clientId)) })),
    ] : [])),
    ...meetings.map((m) => ({ id: `meeting-${m.eventId}`, label: `Meeting · ${m.title}`, aliases: ['meeting', 'review'], run: () => navigate(meetingFullViewHref(m.eventId, m.threadId)) })),
    ...proposals.map((p) => ({ id: `proposal-${p.id}`, label: `Proposal · ${p.title}`, aliases: ['workbench'], run: () => navigate(proposalWorkbenchHref(p.id, p.threadId)) })),
    ...(firmViewer ? [{ id: 'supervision', label: 'Supervision', aliases: ['queue', 'compliance'], run: () => navigate('/supervision') }] : []),
    ...(firmViewer ? [{ id: 'archive', label: 'Archive', aliases: ['records', 'books and records'], run: () => navigate('/archive') }] : []),
    ...(firmViewer ? [{ id: 'kit', label: 'Component kit', aliases: ['kit', 'components', 'gallery'], run: () => navigate('/kit') }] : []),
  ]
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/household-client-views.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx src/workspace/__tests__/workbench-layout.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 8: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 9: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/workspace/full-views/HouseholdView.tsx src/workspace/full-views/ClientView.tsx src/workspace/household/CommunicationsList.tsx \
  src/workspace/household/household-words.ts src/app/routes.tsx src/app/use-destinations.ts \
  src/workspace/__tests__/household-client-views.test.tsx src/workspace/__tests__/shell-keyboard.test.tsx
git commit -m "feat(meetings): household and client full views; the command line offers them and the meeting"
```

---
### Task 14: Robert's recap — the drafts panel, its provenance, and what Robert and Mark see

In Robert's client thread, the drafts panel offers **Ask Client Letter Agent for the recap** once the meeting's record is filed (disabled, with the reason, before then). The draft says where it came from (the filed record and its fingerprint); a stale recap says why and cannot be sent; Adrian edits and sends it as before. Robert then sees exactly one new message and its slip, and nothing of the meeting's firm-only record; Mark sees the recap in Supervision, its provenance included, and the filing in the Archive.

**Files:**
- Create: `src/workspace/context/RecapControl.tsx`
- Modify: `src/workspace/context/DraftsPanel.tsx` (render `RecapControl`; recap `staleReason`), `src/workspace/context/draft-origin.ts`
- Test: `src/workspace/__tests__/draft-origin.test.ts`, `src/workspace/__tests__/recap.test.tsx` (new)

**Interfaces:**
- Consumes: `useMeetings`, `useDraftRecap` (Task 9); `useDrafts` from `@/hooks/use-workspace`; `RecordBasis` (Task 2).
- Produces:

```ts
// src/workspace/context/RecapControl.tsx
export function RecapControl(props: { thread: Thread }): JSX.Element | null
// src/workspace/context/draft-origin.ts (behaviour added): a recap's origin reads "… · from the filed record REC-0001 · fingerprint 1A2B3C4D"
```

Exact strings: button `Ask Client Letter Agent for the recap`; its note `From the filed record of the Johnson annual review (REC-0001)`; before filing `File the record of the Johnson annual review first.`; reports `The Client Letter Agent drafted the recap of the Johnson annual review.` / `The Client Letter Agent's recap of the Johnson annual review is already in the drafts.`; stale `The filed record no longer matches this recap (REC-0001). Ask the Client Letter Agent for a new recap.`

- [ ] **Step 1: Write the failing tests**

In `src/workspace/__tests__/draft-origin.test.ts`, add `sentLetterOrigin` to the import and append:

```ts
it("says a recap came from the filed record, and records it on the send", () => {
  const recordBasis = { eventId: 'evt-010', actId: 'REC-0001', fingerprint: '1A2B3C4D' }
  expect(draftOrigin(draft({ agentId: 'client-letter', recordBasis }), directory))
    .toBe("Drafted by Client Letter Agent at Adrian Hale's request · from the filed record REC-0001 · fingerprint 1A2B3C4D")
  const act = { id: 'REC-0002', kind: 'send_to_client' as const, actorId: 'user-001', at: '2026-02-25T20:30:00.000Z', fingerprint: 'X', summary: 'Message sent to the client', recordBasis, editedBy: [] }
  expect(sentLetterOrigin(act, directory)).toBe('from the filed record REC-0001 · fingerprint 1A2B3C4D · agent draft, unedited')
})
```

Create `src/workspace/__tests__/recap.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { draftMeetingNotes, draftRecap, fileMeetingRecord, getMeeting, holdMeeting, sendToClient } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)
const conversation = () => within(screen.getByRole('list', { name: 'Messages' }))
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const RECAP = 'Ask Client Letter Agent for the recap'

async function filed() {
  await holdMeeting(ADRIAN, 'evt-010')
  await draftMeetingNotes(ADRIAN, 'evt-010')
  const view = await getMeeting(ADRIAN, 'evt-010')
  await fileMeetingRecord(ADRIAN, 'evt-010', view.notesFingerprint!)
}
async function openRobert() {
  renderRoutes(routes, '/t/th-robert')
  await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })
  return inContext().findByRole('region', { name: 'Drafts for Robert' })
}

describe("Robert's recap", () => {
  afterEach(() => sessionStorage.clear())

  it('waits for the filed record, and says so', async () => {
    const panel = await openRobert()
    const button = await within(panel).findByRole('button', { name: RECAP })
    expect(button).toBeDisabled()
    expect(panel).toHaveTextContent('File the record of the Johnson annual review first.')
  })

  it('is drafted from the filed record, names its origin, and is sent as one message', async () => {
    await filed()
    const panel = await openRobert()
    const user = userEvent.setup()
    expect(panel).toHaveTextContent('From the filed record of the Johnson annual review (REC-0001)')
    await user.dblClick(await within(panel).findByRole('button', { name: RECAP }))
    expect(await within(panel).findByRole('status')).toHaveTextContent('The Client Letter Agent drafted the recap of the Johnson annual review.')
    const draft = await within(panel).findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('Dear Robert,')
    expect(draft).toHaveTextContent('What you asked us:')
    expect(draft).toHaveTextContent(/from the filed record REC-0001 · fingerprint [0-9A-F]{8}/)
    expect(store().drafts).toHaveLength(1)
    await user.click(within(draft).getByRole('button', { name: 'Send to Robert' }))
    await waitFor(() => expect(conversation().getAllByRole('listitem').some((li) => li.textContent?.includes('What we decided:'))).toBe(true))
    expect(within(panel).queryByRole('article', { name: 'Draft · not sent' })).toBeNull()
  })

  it('Robert sees exactly the recap, and nothing of the firm-only record', async () => {
    await filed()
    const draft = await draftRecap(ADRIAN, 'th-robert', 'evt-010')
    await sendToClient(ADRIAN, draft.id)
    viewAsOnLoad('cli-001')
    renderRoutes(routes, '/t/th-robert')
    await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })
    await waitFor(() => expect(conversation().getAllByRole('listitem')).toHaveLength(3))
    const texts = store().messages.filter((m) => m.threadId === 'th-robert' && m.kind === 'text')
    expect(texts).toHaveLength(2)
    expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('When is my annual review this year?')
    expect(screen.getByRole('list', { name: 'Messages' })).toHaveTextContent('Dear Robert,')
    expect(document.body).not.toHaveTextContent(/transcript|Meeting Notes|agenda|REC-0001|Sarah Mitchell|Mike Chen|follow-up|filed record/i)
    expect(within(screen.getByRole('navigation', { name: 'Threads' })).getAllByRole('link')).toHaveLength(1)
  })

  it('Mark sees the recap in Supervision with its provenance, and the filing in the Archive', async () => {
    await filed()
    const draft = await draftRecap(ADRIAN, 'th-robert', 'evt-010')
    await sendToClient(ADRIAN, draft.id)
    viewAsOnLoad('cco-001')
    const { unmount } = renderRoutes(routes, '/supervision')
    await screen.findByRole('heading', { level: 1, name: 'Supervision' })
    const queue = screen.getByRole('navigation', { name: 'Supervision queue' })
    await userEvent.setup().click(await within(queue).findByRole('link', { name: /^Message to Robert Johnson/ }))
    const item = await screen.findByRole('region', { name: 'Correspondence · Message to Robert Johnson' })
    expect(item).toHaveTextContent('What we decided:')
    expect(item).toHaveTextContent(/from the filed record REC-0001 · fingerprint [0-9A-F]{8} · agent draft, unedited/)
    unmount()
    renderRoutes(routes, '/archive')
    expect(await screen.findByRole('table', { name: 'Archive' })).toHaveTextContent('REC-0001 · Filed the record of the Johnson annual review')
  })

  it('a stale recap says why and cannot be sent', async () => {
    await filed()
    store().drafts.push({
      id: 'draft-9001', clientThreadId: 'th-robert', authorId: ADRIAN, body: 'Dear Robert, an older recap.', createdAt: '2026-02-25T20:30:00.000Z',
      agentId: 'client-letter', recordBasis: { eventId: 'evt-010', actId: 'REC-0001', fingerprint: 'DEADBEEF' },
    })
    const panel = await openRobert()
    const draft = await within(panel).findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('STALE')
    expect(draft).toHaveTextContent('The filed record no longer matches this recap (REC-0001). Ask the Client Letter Agent for a new recap.')
    expect(within(draft).getByRole('button', { name: 'Send to Robert' })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/workspace/__tests__/draft-origin.test.ts src/workspace/__tests__/recap.test.tsx --testTimeout 30000`
Expected: FAIL — no recap control; the origin does not name the filed record.

- [ ] **Step 3: Provenance**

Replace `src/workspace/context/draft-origin.ts` with:

```ts
import type { BindingAct, Directory, Draft, LetterBasis, RecordBasis } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

/** What an agent letter was written from: an approved version, or a filed meeting record. */
function basisWords(basis: LetterBasis | undefined, recordBasis: RecordBasis | undefined): string | undefined {
  if (basis) return `from v${basis.version} · fingerprint ${basis.fingerprint}`
  if (recordBasis) return `from the filed record ${recordBasis.actId} · fingerprint ${recordBasis.fingerprint}`
  return undefined
}

/** Who wrote a draft, at whose request, who edited it, and what it was written from. */
export function draftOrigin(draft: Draft, directory: Directory): string {
  const author = personIn(directory, draft.authorId).name
  const agent = draft.agentId ? directory.agents.find((a) => a.id === draft.agentId)?.name : undefined
  const who = !agent ? `Drafted by ${author}` : draft.supersedes ? `${agent}'s draft, edited by ${author}` : `Drafted by ${agent} at ${author}'s request`
  const from = basisWords(draft.basis, draft.recordBasis)
  return from ? `${who} · ${from}` : who
}

/** Where a sent agent letter came from, for the firm's record: what it was written from and who edited it. Undefined for other acts. */
export function sentLetterOrigin(act: BindingAct, directory: Directory): string | undefined {
  if (act.kind !== 'send_to_client' || !act.editedBy) return undefined
  const editors = act.editedBy.map((id) => personIn(directory, id).name)
  const edits = editors.length > 0 ? `edited by ${editors.join(' and ')}` : 'agent draft, unedited'
  const from = basisWords(act.basis, act.recordBasis)
  return from ? `${from} · ${edits}` : edits
}
```

- [ ] **Step 4: The recap control**

Create `src/workspace/context/RecapControl.tsx`:

```tsx
import { useId, useRef, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { useDraftRecap, useMeetings } from '@/hooks/use-meetings'
import { useDrafts } from '@/hooks/use-workspace'
import type { Thread } from '@/types/workspace'
import type { MeetingSummary } from '@/types/workspace-meeting'

type Asked = { draftId: string; title: string; created: boolean }

/** Asks the Client Letter Agent for the recap of a meeting with this thread's client, once its record is filed. */
export function RecapControl({ thread }: { thread: Thread }) {
  const meetings = useMeetings()
  const recap = useDraftRecap(thread.id)
  const drafts = useDrafts(thread.id, true)
  const [asked, setAsked] = useState<Asked>()
  // A ref, not render state, so a double-click cannot send a second request before the first settles.
  const asking = useRef(false)
  const reasonId = useId()
  if (meetings.isPending) return <p role="status" className="text-body text-ink-3">Loading the meetings…</p>
  if (meetings.isError) return <p role="alert" className="text-body">{meetings.error.message}</p>
  const withClient = meetings.data.filter((m) => m.clientId === thread.clientId)
  if (withClient.length === 0) return null
  const ask = (meeting: MeetingSummary) => {
    if (asking.current) return
    asking.current = true
    const held = new Set((drafts.data ?? []).map((d) => d.id))
    setAsked(undefined)
    recap.mutate(meeting.eventId, {
      onSuccess: (draft) => setAsked({ draftId: draft.id, title: meeting.title, created: !held.has(draft.id) }),
      onSettled: () => { asking.current = false },
    })
  }
  // The report stands only while the draft it names is still held: it clears once that draft is sent or replaced.
  const reported = asked && drafts.data?.some((d) => d.id === asked.draftId) ? asked : undefined
  return (
    <div className="flex flex-col items-start gap-2">
      {withClient.map((m) => (m.filedActId ? (
        <div key={m.eventId} className="flex flex-col items-start gap-1">
          <Button rank="secondary" disabled={recap.isPending} onClick={() => ask(m)}>Ask Client Letter Agent for the recap</Button>
          <span className="text-label text-ink-3">{`From the filed record of the ${m.title} (${m.filedActId})`}</span>
        </div>
      ) : (
        <div key={m.eventId} className="flex flex-col items-start gap-1">
          <Button rank="secondary" disabled aria-describedby={reasonId}>Ask Client Letter Agent for the recap</Button>
          <span id={reasonId} className="text-label text-ink-3">{`File the record of the ${m.title} first.`}</span>
        </div>
      )))}
      {recap.isError ? <p role="alert" className="text-body">{recap.error.message}</p> : null}
      {reported ? (
        <p role="status" className="text-body text-ink-2">{reported.created
          ? `The Client Letter Agent drafted the recap of the ${reported.title}.`
          : `The Client Letter Agent's recap of the ${reported.title} is already in the drafts.`}</p>
      ) : null}
    </div>
  )
}
```

In `src/workspace/context/DraftsPanel.tsx`:

- import `RecapControl` from `./RecapControl`;
- after `{canDraft ? <LetterControl thread={thread} /> : null}` add `{canDraft ? <RecapControl thread={thread} /> : null}`;
- `staleReason` begins:

```ts
function staleReason(draft: Draft, proposals: ProposalDetail[] | undefined): string {
  if (draft.recordBasis) return `The filed record no longer matches this recap (${draft.recordBasis.actId}). Ask the Client Letter Agent for a new recap.`
```

(the rest of the function is unchanged).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/workspace/__tests__/draft-origin.test.ts src/workspace/__tests__/recap.test.tsx src/workspace/__tests__/letter.test.tsx src/workspace/__tests__/supervision.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 6: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 7: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/workspace/context/RecapControl.tsx src/workspace/context/DraftsPanel.tsx src/workspace/context/draft-origin.ts \
  src/workspace/__tests__/draft-origin.test.ts src/workspace/__tests__/recap.test.tsx
git commit -m "feat(meetings): Robert's recap in the drafts panel, its filed-record provenance; Robert sees only the recap"
```

---
### Task 15: Carry-overs, the story end to end, and the visual baselines

Two Phase 4 carry-overs in files this phase already touches the neighbours of (the Proposal Agent's self-wash sentence that read as contradicting its IRA/Roth caveat; the Archive's date selects that could not show a date from the URL), then the whole Johnson annual review driven through the browser by one presenter, the new baselines, and every drifted baseline regenerated and looked at.

**Files:**
- Modify: `src/mocks/agents/proposal-agent.ts:14`, `src/mocks/workspace/__tests__/proposals.test.ts`, `src/workspace/archive/ArchivePage.tsx`, `src/workspace/__tests__/archive.test.tsx`, `e2e-visual/workspace-steps.ts`
- Create: `e2e-visual/meeting-review.spec.ts`
- Regenerate: every PNG under `e2e-visual/__baselines__/` that drifts; add `meeting-thread-light.png`, `meeting-before-light.png`, `meeting-before-dark.png`, `meeting-after-light.png`, `meeting-after-dark.png`, `household-light.png`, `client-light.png`, `robert-recap-light.png`

**Interfaces:**
- Consumes: everything above; the existing steps (`askProposalAgent`, `approve`, `releaseByShortcut`, `viewAs`, `deskLink`, `threadLink`, `context`, `conversation`, `heading`, `letterDraft`, `settle`, `visit`).
- Produces (in `e2e-visual/workspace-steps.ts`):

```ts
export const meetingPanel: (page: Page) => Locator          // the context column's "Meeting" region
export async function runPrep(page: Page): Promise<void>     // Run prep → Agenda · v1 shown
export async function holdTheMeeting(page: Page): Promise<void>
export async function draftNotes(page: Page): Promise<void>
export async function fileRecord(page: Page): Promise<void>
export async function askForRecap(page: Page): Promise<void>
export async function goTo(page: Page, destination: string): Promise<void>   // the command line
```

- [ ] **Step 1: Carry-over — the Proposal Agent's self-wash sentence**

The sentence "buys nothing that would wash one of the taxpayer's losses" sits beside a caveat that an IRA or Roth buy forecloses a *future* harvest, and reads as if the two disagree. What `avoid_self_wash` guarantees is narrower and true: no buy washes a loss already taken or taken by this proposal. In `src/mocks/agents/proposal-agent.ts` line 14:

```ts
const NO_SELF_WASH = 'buys nothing that would wash a loss the taxpayer has taken or this proposal takes'
```

and update the four pinned strings in `src/mocks/workspace/__tests__/proposals.test.ts`:

```bash
sed -i '' "s/buys nothing that would wash one of the taxpayer's losses/buys nothing that would wash a loss the taxpayer has taken or this proposal takes/g" src/mocks/workspace/__tests__/proposals.test.ts
grep -rn "wash one of the taxpayer's losses" src e2e-visual
```

Expected: the `grep` prints nothing.

Run: `pnpm vitest run src/mocks/workspace/__tests__/proposals.test.ts src/mocks/agents/__tests__/agents.test.ts --testTimeout 30000`
Expected: PASS.

- [ ] **Step 2: Carry-over — the Archive's date selects show a date from the URL**

Add to `src/workspace/__tests__/archive.test.tsx`, inside its `describe`:

```tsx
  it('keeps a date from the URL selectable even when no record falls on it', async () => {
    await session()
    renderRoutes(routes, '/archive?from=2026-02-20&to=2026-02-27')
    await archiveRows()
    expect(screen.getByLabelText('From')).toHaveValue('2026-02-20')
    expect(screen.getByLabelText('To')).toHaveValue('2026-02-27')
  })
```

Run: `pnpm vitest run src/workspace/__tests__/archive.test.tsx --testTimeout 30000`
Expected: FAIL — the selects fall back to "Any date".

In `src/workspace/archive/ArchivePage.tsx`, the `dates` line becomes:

```tsx
  // A date the URL names stays selectable even when no record falls on it, so the select shows the filter in force.
  const knownDates = [...new Set([...(data?.dates ?? []), ...(filters.from ? [filters.from] : []), ...(filters.to ? [filters.to] : [])])].sort()
  const dates = [{ value: '', label: 'Any date' }, ...knownDates.map((d) => ({ value: d, label: fmtDate(d) }))]
```

Run: `pnpm vitest run src/workspace/__tests__/archive.test.tsx --testTimeout 30000`
Expected: PASS.

- [ ] **Step 3: The story's steps**

Append to `e2e-visual/workspace-steps.ts` (add `type Locator` to the `@playwright/test` import):

```ts
/** The meeting thread's context panel. */
export const meetingPanel = (page: Page): Locator => context(page).getByRole('region', { name: 'Meeting' })

/** Meeting Prep's findings and agenda v1 — from the meeting thread's panel or the meeting view, wherever the button is. */
export async function runPrep(page: Page) {
  await page.getByRole('button', { name: 'Run prep' }).click()
  await expect(page.getByRole('list', { name: 'Agenda · v1' })).toBeVisible()
}

export async function holdTheMeeting(page: Page) {
  await page.getByRole('button', { name: 'Hold the meeting' }).click()
  await page.getByRole('dialog', { name: 'Hold the meeting?' }).getByRole('button', { name: 'Hold the meeting' }).click()
  await expect(page.getByRole('button', { name: 'Draft notes' })).toBeVisible()
}

export async function draftNotes(page: Page) {
  await page.getByRole('button', { name: 'Draft notes' }).click()
  await expect(page.getByRole('button', { name: 'File the record' })).toBeVisible()
}

export async function fileRecord(page: Page) {
  await page.getByRole('button', { name: 'File the record' }).click()
  await page.getByRole('dialog', { name: /^File the record of the .+\?$/ }).getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText(/^Filed · REC-\d{4}/).first()).toBeVisible()
}

export async function askForRecap(page: Page) {
  await context(page).getByRole('button', { name: 'Ask Client Letter Agent for the recap' }).click()
  await expect(letterDraft(page)).toContainText('What you asked us:')
}

/** The command line: nothing holds focus, then "/" and the destination's label. */
export async function goTo(page: Page, destination: string) {
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
  await page.keyboard.press('/')
  await page.getByRole('combobox', { name: 'Go to' }).fill(destination)
  await page.keyboard.press('Enter')
}
```

- [ ] **Step 4: The spec — scenes, layout checks and the story**

Create `e2e-visual/meeting-review.spec.ts`:

```ts
import { test, expect, type Locator, type Page } from '@playwright/test'
import { SCREENSHOT, clippedLabels, pageOverflowX } from './layout-checks'
import {
  approve, askForRecap, askProposalAgent, context, conversation, deskLink, draftNotes, fileRecord, goTo, heading, holdTheMeeting,
  letterDraft, meetingPanel, releaseByShortcut, runPrep, settle, threadLink, viewAs, visit, type Theme,
} from './workspace-steps'

type Layout = 'three-panes' | 'beside-thread' | 'list-and-main'
type Scene = { name: string; layout: Layout; held?: boolean; open: (page: Page) => Promise<void> }

const liveThread = (page: Page) => page.getByRole('complementary', { name: 'Live thread' })

async function meetingView(page: Page) {
  await meetingPanel(page).getByRole('link', { name: /Open the meeting view/ }).click()
  await expect(heading(page)).toHaveText('Johnson annual review')
  await expect(liveThread(page).getByRole('list', { name: 'Thread feed' })).toBeVisible()
}

const meetingThread = async (page: Page) => {
  await visit(page, '/t/th-johnson-meeting', 'light')
  await runPrep(page)
  await settle(page)
}

const meetingBefore = (theme: Theme) => async (page: Page) => {
  await visit(page, '/t/th-johnson-meeting', theme)
  await runPrep(page)
  await meetingView(page)
  await expect(page.getByRole('table', { name: 'Household accounts' })).toBeVisible()
  await settle(page)
}

const meetingAfter = (theme: Theme) => async (page: Page) => {
  await visit(page, '/t/th-johnson-meeting', theme)
  await runPrep(page)
  await meetingView(page)
  await holdTheMeeting(page)
  await draftNotes(page)
  await expect(page.getByRole('list', { name: 'Decisions' })).toBeVisible()
  await settle(page)
}

const household = async (page: Page) => {
  await visit(page, '/households/hh-001', 'light')
  await expect(page.getByRole('table', { name: 'Documents' })).toBeVisible()
  await settle(page)
}

const client = async (page: Page) => {
  await visit(page, '/clients/cli-001', 'light')
  await expect(page.getByRole('table', { name: 'Accounts owned' })).toBeVisible()
  await settle(page)
}

const robertRecap = async (page: Page) => {
  await visit(page, '/t/th-johnson-meeting', 'light')
  await holdTheMeeting(page)
  await draftNotes(page)
  await fileRecord(page)
  await threadLink(page, 'Robert Johnson').click()
  await expect(heading(page)).toHaveText('Robert Johnson')
  await askForRecap(page)
  await settle(page)
}

const SCENES: Scene[] = [
  { name: 'meeting-thread-light', layout: 'three-panes', open: meetingThread },
  { name: 'meeting-before-light', layout: 'beside-thread', open: meetingBefore('light') },
  { name: 'meeting-before-dark', layout: 'beside-thread', open: meetingBefore('dark') },
  { name: 'meeting-after-light', layout: 'beside-thread', held: true, open: meetingAfter('light') },
  { name: 'meeting-after-dark', layout: 'beside-thread', held: true, open: meetingAfter('dark') },
  { name: 'household-light', layout: 'list-and-main', open: household },
  { name: 'client-light', layout: 'list-and-main', open: client },
  { name: 'robert-recap-light', layout: 'three-panes', open: robertRecap },
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

    if (scene.layout === 'beside-thread') {
      test('the meeting takes the main pane beside the live thread; no thread list', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await scene.open(page)
        await expect(page.getByRole('navigation', { name: 'Threads' })).toHaveCount(0)
        const [main, live] = await Promise.all([boxOf(page.getByRole('main')), boxOf(liveThread(page))])
        expect(live.x).toBeGreaterThanOrEqual(main.x + main.width - 1)
      })
    }

    if (scene.held) {
      test('the transcript sits beside the notes at 1440px and above them at 1024px', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await scene.open(page)
        const transcript = page.getByRole('list', { name: 'Transcript' })
        const notes = page.getByRole('list', { name: 'Discussion' })
        const [t, n] = await Promise.all([boxOf(transcript), boxOf(notes)])
        expect(n.x).toBeGreaterThanOrEqual(t.x + t.width)
        await page.setViewportSize({ width: 1024, height: 900 })
        const [narrowT, narrowN] = await Promise.all([boxOf(transcript), boxOf(notes)])
        expect(narrowN.y).toBeGreaterThanOrEqual(narrowT.y + narrowT.height)
      })
    }
  })
}

test('one presenter runs the Johnson annual review end to end; Robert sees only the recap; Mark sees the record', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // 1. The morning (Phases 3–4): v1 approved and released through the presenter shortcut, so the meeting reads the moved book.
  await askProposalAgent(page, 'light')
  await approve(page, 1)
  await releaseByShortcut(page)

  // 2. The Brief's line for the meeting, to the meeting thread.
  await threadLink(page, 'Brief').click()
  const notice = conversation(page).getByRole('article', { name: 'Meeting · Johnson annual review' })
  await expect(notice).toContainText('Meeting at 14:00 ET')
  await notice.getByRole('link', { name: /Open the meeting thread/ }).click()
  await expect(heading(page)).toHaveText('Johnson annual review')

  // 3. Prep: findings in the thread, agenda v1; Adrian adds an item (v2).
  await runPrep(page)
  await expect(conversation(page).getByRole('article', { name: /^Meeting Prep: Orders released today were filled/ })).toBeVisible()
  await meetingPanel(page).getByRole('textbox', { name: 'New agenda item' }).fill('ESG alternatives for the trust')
  await meetingPanel(page).getByRole('button', { name: 'Add to agenda' }).click()
  await expect(meetingPanel(page).getByRole('list', { name: 'Agenda · v2' })).toContainText('ESG alternatives for the trust')

  // 4. The meeting view, beside the live thread; Adrian holds the meeting there.
  await meetingView(page)
  await holdTheMeeting(page)
  await expect(liveThread(page)).toContainText('Meeting held · 14:00–15:15 ET · transcript received')

  // 5. The notes, beside the transcript; a citation hovered lights its line.
  await draftNotes(page)
  await page.getByRole('list', { name: 'Decisions' }).getByRole('button', { name: 'Cites t-07 · Patricia Johnson' }).hover()
  await expect(page.locator('#transcript-t-07')).toHaveAttribute('data-highlighted', 'true')

  // 6. An edit, saved; the record filed; the tasks.
  await page.getByRole('button', { name: 'Edit n-01' }).click()
  await page.getByRole('textbox', { name: 'Edit n-01' }).fill('Reviewed the rebalance and the Intel harvest.')
  await page.getByRole('button', { name: 'Save notes' }).click()
  await expect(page.getByText('Unsaved edits')).toHaveCount(0)
  await fileRecord(page)
  await expect(page.getByRole('table', { name: 'Follow-up tasks' })).toContainText('Sarah Mitchell')
  await expect(page.getByRole('table', { name: 'Follow-up tasks' })).toContainText('2026-03-02')

  // 7. The thread: the slip and the task list.
  await page.getByRole('link', { name: 'Back to the thread' }).click()
  await expect(conversation(page).getByRole('article', { name: 'Filed the record of the Johnson annual review' })).toBeVisible()
  await expect(conversation(page).getByRole('article', { name: 'Tasks from the filed record' })).toBeVisible()

  // 8. Robert's thread: the recap, drafted and sent.
  await threadLink(page, 'Robert Johnson').click()
  await expect(heading(page)).toHaveText('Robert Johnson')
  await askForRecap(page)
  await letterDraft(page).getByRole('button', { name: 'Send to Robert' }).click()
  await expect(conversation(page)).toContainText('What we decided:')

  // 9. Robert sees his question, the recap and its slip — nothing of the firm's record.
  await viewAs(page, 'Robert Johnson · Client')
  await expect(conversation(page).getByRole('listitem')).toHaveCount(3)
  await expect(conversation(page)).toContainText('When is my annual review this year?')
  await expect(page.locator('body')).not.toContainText(/transcript|agenda|Meeting Notes|follow-up|Sarah Mitchell|Mike Chen|filed record/i)
  await expect(page.getByRole('navigation', { name: 'Threads' }).getByRole('link')).toHaveCount(1)

  // 10. Mark: the recap in Supervision with its provenance; the filing in the Archive.
  await viewAs(page, 'Mark Davis · Compliance')
  await deskLink(page, 'Supervision').click()
  await page.getByRole('navigation', { name: 'Supervision queue' }).getByRole('link', { name: /^Message to Robert Johnson/ }).click()
  await expect(page.getByRole('region', { name: 'Correspondence · Message to Robert Johnson' })).toContainText(/from the filed record REC-\d{4} · fingerprint/)
  await deskLink(page, 'Archive').click()
  await expect(page.getByRole('table', { name: 'Archive' })).toContainText('Filed the record of the Johnson annual review')

  // 11. Adrian: the household and a client from the command line.
  await viewAs(page, 'Adrian Hale · Advisor')
  await goTo(page, 'Household · Johnson')
  await expect(heading(page)).toHaveText('Johnson Household')
  await expect(page.getByRole('list', { name: 'Past meetings' })).toContainText('FILED')
  await expect(page.getByRole('table', { name: 'Open wash-sale windows' })).toContainText('2026-03-27')
  await goTo(page, 'Client · Patricia Johnson')
  await expect(heading(page)).toHaveText('Patricia Johnson')
  await expect(page.getByRole('main')).toContainText('Conservative · score 35 of 100 · assessed 2025-09-15')
})
```

- [ ] **Step 5: Run the new spec against missing baselines**

Run: `VISUAL_PORT=5195 pnpm visual -- e2e-visual/meeting-review.spec.ts`
Expected: the eight baseline tests FAIL with "A snapshot doesn't exist"; every layout test and the story PASS. A story or layout failure is a bug in an earlier task: fix it there (with its unit test) before any baseline is written.

- [ ] **Step 6: Regenerate every baseline and look at each one**

Run: `VISUAL_PORT=5195 pnpm visual:update`
Then open every PNG the command wrote or rewrote (`git status e2e-visual/__baselines__`) and check, for each: the thread list (where shown) lists Brief, Johnson Rebalance Review, Johnson annual review, Robert Johnson; the Desk pane lists Meeting Prep and Meeting Notes among the agents; no text is clipped or overlapping; light and dark both legible. For the new ones: the meeting thread shows the prep findings without OUT codes and the agenda in the panel; the meeting view shows the header (2026-02-25 · 14:00–15:15 ET · Office — Main), the agenda, the household panes, and after holding the transcript beside the notes with citations; the household and client views show their panes; Robert's thread shows the recap draft with "from the filed record REC-0001". Name any PNG that looks wrong in the task report and fix its cause before committing.

- [ ] **Step 7: Run the whole visual suite against the new baselines**

Run: `VISUAL_PORT=5195 pnpm visual`
Expected: PASS, every spec.

- [ ] **Step 8: Full suite, lint, build**

Run: `pnpm vitest run --testTimeout 30000 && pnpm lint && pnpm build`
Expected: all green.

- [ ] **Step 9: Commit**

Commit with the message below, followed by the trailer naming the model that wrote the commit:

```bash
git add src/mocks/agents/proposal-agent.ts src/mocks/workspace/__tests__/proposals.test.ts src/workspace/archive/ArchivePage.tsx src/workspace/__tests__/archive.test.tsx \
  e2e-visual/workspace-steps.ts e2e-visual/meeting-review.spec.ts e2e-visual/__baselines__
git commit -m "test(visual): the Johnson annual review end to end; meeting, household, client and recap baselines; carry-overs"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| Data truth: evt-010 today 14:00–15:15 ET with household and attendees; no weekend events; plan review date; one IPS story; no communication after now; comm-009 ties to rs-001; comm-014 names ha-001; old prep text removed | 1 |
| Meeting store, state machine, transcript readable only when held, hold advances the clock to 20:15Z, the held line | 2, 3 |
| Meeting Prep (measures fills, windows, drift, goals, held-away, open items, RMD; agenda by attention), digit-free, cited | 4 |
| Meeting Notes (cited lines; no assignment it was not given; no recommendation nobody made), edits until filed | 5 |
| `file_meeting_record` (advisor only; 403/404; held only; once → 409; fingerprint; append-only; Archive) and tasks with trading-day dues | 6 |
| The recap via the Client Letter Agent, tied to the filing's fingerprint, stale → 409, only decisions and client requests; Mark's correspondence review | 7, 14 |
| Household and client read models | 8 |
| API table (viewer-filtered; client 404) | 9 |
| Meeting thread: Brief line, Run prep, agenda edits as versions, Hold / Draft notes / File the record, slip then tasks | 2, 10, 11 |
| Meeting full view beside the live thread; household summary; transcript beside notes; citation highlight; edits and filing | 10, 12 |
| Household and client full views; links from the thread context, the meeting view and the command line | 11, 13 |
| Visibility: Robert sees only the recap; full views firm only | 9, 11–14 |
| Reset restores the seed | 2, 6 |
| Testing: engine, data-truth guards, UI end to end, visual baselines | every task; 15 |
| Carry-overs (optional) | 15 |
