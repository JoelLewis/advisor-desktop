import type { MeetingState } from '@/types/workspace-meeting'

export const MEETING_STATE_TAG: Readonly<Record<MeetingState, string>> = { scheduled: 'SCHEDULED', held: 'HELD', filed: 'FILED' }

export const ADVISOR_RUNS_IT = 'Only the advisor runs the meeting: prep, the agenda, holding it and its notes.'
