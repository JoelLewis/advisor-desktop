import { useParams } from 'react-router-dom'
import { useDirectory, useThread } from '@/hooks/use-workspace'

/** A thread has context to show unless it was not found or failed to load; the thread itself reports why. */
export function useThreadContextAvailable(): boolean {
  const { threadId } = useParams()
  if (!threadId) throw new Error('The thread context needs a thread id')
  const thread = useThread(threadId)
  const directory = useDirectory()
  return !thread.isError && !directory.isError
}
