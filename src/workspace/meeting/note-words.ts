import type { NoteSection } from '@/types/workspace-meeting'

export const NOTE_SECTION_TITLE: Readonly<Record<NoteSection, string>> = {
  discussion: 'Discussion', decisions: 'Decisions', client_requests: 'Client requests', follow_ups: 'Follow-ups',
}

export const FILED_RECORD_ID = 'meeting-filed-record'
export const SAVE_BEFORE_FILING = 'Save your edits before filing.'
