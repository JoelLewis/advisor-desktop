import type { MeetingState } from '@/types/workspace-meeting'

export const TODAY_MEETING_STATE: Readonly<Record<MeetingState, string>> = { scheduled: 'scheduled', held: 'held', filed: 'filed' }
