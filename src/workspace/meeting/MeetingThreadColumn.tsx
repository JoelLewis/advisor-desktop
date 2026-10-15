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
