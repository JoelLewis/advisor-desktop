import type { Directory, Thread } from '@/types/workspace'
import { composerModeOf } from './composer-mode'

/** A firm thread the viewer can post in: they may ask its drafting agents. The engine checks again on every request. */
export const canPostIn = (thread: Thread, viewerId: string, directory: Directory): boolean =>
  thread.visibility !== 'client' && composerModeOf(thread, viewerId, directory).kind === 'post'
