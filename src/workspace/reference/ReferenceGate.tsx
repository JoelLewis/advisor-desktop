import type { ReactNode } from 'react'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import { useGoHomeWhenHidden } from '@/workspace/full-views/use-go-home-when-hidden'
import { isNotFound } from '@/workspace/is-not-found'

type ReferenceQuery<T> = { isError: boolean; error: Error | null; data: T | undefined }

/** Firm only: an outsider is told the view does not exist, and a switch of "View as" to an outsider goes home. */
export function ReferenceGate<T>({ query, subject, children }: { query: ReferenceQuery<T>; subject: string; children: (data: T) => ReactNode }) {
  const hiddenFromNewViewer = useGoHomeWhenHidden(query)
  const loading = <p role="status" className="text-body text-ink-3">{`Loading ${subject.toLowerCase()}…`}</p>
  if (hiddenFromNewViewer) return loading
  if (query.isError && query.error) return isNotFound(query.error) ? <FullViewNotFound subject={subject} /> : <p role="alert" className="text-body">{query.error.message}</p>
  if (query.data === undefined) return loading
  return <>{children(query.data)}</>
}
