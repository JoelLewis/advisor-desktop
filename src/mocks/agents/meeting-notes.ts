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
  { id: 'n-08', section: 'decisions', text: "Robert will not buy Intel back in any of his or Patricia's accounts, including the IRAs, until its window closes. The firm treats the held-away Vanguard 401(k) as if it counts, as firm policy: the rule for employer plans is unsettled. Reinvested dividends count as buying.", cites: ['t-03', 't-04', 't-05'] },
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
