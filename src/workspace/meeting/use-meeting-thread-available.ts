import { useParams } from 'react-router-dom'
import { useMeeting } from '@/hooks/use-meetings'
import { useDirectory } from '@/hooks/use-workspace'

/** The live thread shows only while the meeting is readable; the page itself reports why not. */
export function useMeetingThreadAvailable(): boolean {
  const { eventId } = useParams()
  if (!eventId) throw new Error('The meeting view needs an event id')
  const meeting = useMeeting(eventId)
  const directory = useDirectory()
  return !meeting.isError && !directory.isError
}
