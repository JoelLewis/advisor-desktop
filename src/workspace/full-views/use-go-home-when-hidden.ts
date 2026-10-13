import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNotFound } from '@/workspace/is-not-found'
import { useViewer } from '@/workspace/viewer/use-viewer'

/**
 * Switching "view as" to someone who cannot see the open subject goes home rather than showing them a 404.
 * Returns true while that redirect is pending, so the page can show its loading line instead.
 */
export function useGoHomeWhenHidden(query: { isError: boolean; error: Error | null }): boolean {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const hiddenFromNewViewer = viewerId !== openedAs && query.isError && query.error !== null && isNotFound(query.error)
  useEffect(() => {
    if (hiddenFromNewViewer) navigate('/', { replace: true })
  }, [hiddenFromNewViewer, navigate])
  return hiddenFromNewViewer
}
