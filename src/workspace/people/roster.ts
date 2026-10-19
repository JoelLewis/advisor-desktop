import { FIRM_SHORT_NAME } from '@/lib/firm'
import type { Thread } from '@/types/workspace'

export const OUTSIDER_THREAD_TITLE = `Your conversation with ${FIRM_SHORT_NAME}`

/** The thread's title as its viewer reads it: an outsider's own conversation is addressed to them. */
export const threadTitleFor = (thread: Thread, viewerIsExternal: boolean): string => (viewerIsExternal ? OUTSIDER_THREAD_TITLE : thread.title)
