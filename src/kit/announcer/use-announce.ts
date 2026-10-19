import { useContext } from 'react'
import { AnnouncerContext } from './announcer-context'

/** Says a message in the app's one polite live region. */
export function useAnnounce(): (message: string) => void {
  const announce = useContext(AnnouncerContext)
  if (!announce) throw new Error('useAnnounce must be used inside AnnouncerProvider')
  return announce
}
