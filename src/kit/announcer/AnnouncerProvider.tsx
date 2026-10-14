import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnnouncerContext } from './announcer-context'

/**
 * The app's one live region, mounted empty and kept mounted, so screen readers hear what is written into it.
 * A message is written a frame after the region is cleared, so the same words twice are announced twice.
 * When `resetKey` changes (the viewer switched) the region is emptied, so one viewer's words never sit in another's page.
 */
export function AnnouncerProvider({ children, resetKey }: { children: ReactNode; resetKey?: string }) {
  const [message, setMessage] = useState('')
  const frame = useRef(0)
  const announce = useCallback((next: string) => {
    cancelAnimationFrame(frame.current)
    setMessage('')
    frame.current = requestAnimationFrame(() => setMessage(next))
  }, [])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  useEffect(() => { setMessage('') }, [resetKey])
  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" data-part="announcer" className="sr-only">{message}</div>
    </AnnouncerContext.Provider>
  )
}
