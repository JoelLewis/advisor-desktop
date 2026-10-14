import type { StoryStepId } from '@/types/workspace-story'

export type HomeStep = { id: StoryStepId; title: string; detail: string; to: string; linkLabel: string }

/**
 * The README's eight steps (Task 22 keeps the two in agreement). Tour copy that mirrors the README: the thread
 * titles, QAI, v3 and Mark Davis are named here as the spec dictates, not read over the API.
 */
export const HOME_STEPS: readonly HomeStep[] = [
  { id: 'brief', title: 'The Brief', detail: 'Today, what needs a decision, and the context behind it.', to: '/t/th-brief', linkLabel: 'Open the Brief' },
  { id: 'rebalance', title: 'The Johnson rebalance and harvest', detail: 'Take the Intel finding to the team thread, ask the Proposal Agent, revise to harvest only, exclude QAI in the workbench, approve v3.', to: '/t/th-johnson-review', linkLabel: 'Open Johnson Rebalance Review' },
  { id: 'release', title: 'Compliance releases, as Mark Davis', detail: "The presenter's shortcut records Mark's release; the orders fill at the day's prices.", to: '/t/th-johnson-review', linkLabel: 'Release the orders' },
  { id: 'blotter', title: 'The blotter and the moved book', detail: "Each order filled under the release's record; Intel leaves the holdings and the Brief's decisions.", to: '/blotter', linkLabel: 'Open the blotter' },
  { id: 'meeting', title: 'The Johnson annual review', detail: 'Prep, hold the meeting, draft and file the notes, then send Robert the recap.', to: '/t/th-johnson-meeting', linkLabel: 'Open Johnson annual review' },
  { id: 'pell', title: 'Dr. Amanda Pell, first contact to onboarding', detail: 'Form CRS before the coffee (firm policy), her reply, a staged sale over two tax years, her acceptance.', to: '/t/th-pell', linkLabel: 'Open her thread' },
  { id: 'reference', title: 'The reference views', detail: 'Billing, Models, Practice and the Blotter; resolve a reconciliation break; take a risk row to a team thread.', to: '/reconciliation', linkLabel: 'Open Reconciliation' },
  { id: 'view_as', title: 'View as Robert', detail: 'Set View as to Robert Johnson · Client: one thread, his own.', to: '/t/th-robert', linkLabel: 'Open his thread' },
]
