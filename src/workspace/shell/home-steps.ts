import type { StoryStepId } from '@/types/workspace-story'

export type HomeStep = { id: StoryStepId; title: string; detail: string; to: string; linkLabel: string }

/**
 * The README's eight steps (Task 22 keeps the two in agreement). Each step says why it matters before what to
 * click; the thread titles, QAI and Mark Davis are named here, not read over the API.
 */
export const HOME_STEPS: readonly HomeStep[] = [
  { id: 'brief', title: 'The Brief', detail: "Start where the agents left the day: what is on the calendar, what needs your decision and why. Choose Brief.", to: '/t/th-brief', linkLabel: 'Open the Brief' },
  { id: 'rebalance', title: 'The Johnson rebalance and harvest', detail: "Turn the Intel tax loss into a trade the team can check: share the finding to the team thread, ask the Proposal Agent, revise it to sell only at a loss, leave the QAI fund out in the workbench, then approve with a suitability reason, because Growth sits above Robert's tolerance.", to: '/t/th-johnson-review', linkLabel: 'Open Johnson Rebalance Review' },
  { id: 'release', title: 'Compliance releases, as Mark Davis', detail: "Nothing trades until compliance releases it. Choose Demo · act as Mark Davis: the release is recorded as his, and the orders fill at the day's prices.", to: '/t/th-johnson-review', linkLabel: 'Release the orders' },
  { id: 'blotter', title: 'The blotter and the updated holdings', detail: "See that each order filled under the release's record, and that Intel has left the holdings and the Brief's decisions.", to: '/blotter', linkLabel: 'Open the blotter' },
  { id: 'meeting', title: 'The Johnson annual review', detail: 'Prepare, hold and file the meeting so the record and the recap agree: prep, Demo · hold the meeting, draft and file the notes, then send Robert and Patricia the recap.', to: '/t/th-johnson-meeting', linkLabel: 'Open Johnson annual review' },
  { id: 'pell', title: 'Dr. Amanda Pell, first contact to onboarding', detail: 'Turn a referral into a signed-up client, with each disclosure on time: Form CRS before the coffee (firm policy), her reply, a phased sale over two tax years, her acceptance.', to: '/t/th-pell', linkLabel: 'Open her thread' },
  { id: 'reference', title: 'The reports', detail: 'Check the book from the firm side: Billing, Models, Practice and the Blotter; resolve a reconciliation break; share a risk row to a team thread.', to: '/reconciliation', linkLabel: 'Open Reconciliation' },
  { id: 'view_as', title: 'View as Robert', detail: 'See what the client sees: set View as to Robert Johnson · Client. One conversation, his own, and the truth about who reads it.', to: '/t/th-robert', linkLabel: 'Open his thread' },
]
