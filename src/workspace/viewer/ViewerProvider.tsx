import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WORKSPACE_QUERY_PREFIX, useViewAsDirectory } from '@/hooks/use-workspace'
import { brandOf } from '@/workspace/shell/brand-words'
import { DEFAULT_VIEWER_ID, ViewerContext, resolveViewer } from './viewer-context'

const STORAGE_KEY = 'ws-viewer'

function readStoredViewer(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? DEFAULT_VIEWER_ID
  } catch {
    return DEFAULT_VIEWER_ID
  }
}

function storeViewer(id: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Storage unavailable (private mode, blocked): the choice simply won't survive a reload. Harmless by design.
  }
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [restoredId] = useState(readStoredViewer)
  const [chosenId, setChosenId] = useState<string>()
  // A viewer restored from the session (other than the advisor) is checked against the directory before anything asks as them.
  const restoring = chosenId === undefined && restoredId !== DEFAULT_VIEWER_ID
  // The same directory names whoever else is viewing, so the header and the tab say the right name from the first frame.
  const people = useViewAsDirectory((chosenId ?? restoredId) !== DEFAULT_VIEWER_ID)
  const viewerId = chosenId ?? resolveViewer(restoredId, people.data)
  const brand = useMemo(() => brandOf(viewerId, people.data?.people), [viewerId, people.data])
  const setViewerId = useCallback((id: string) => {
    setChosenId(id)
    storeViewer(id)
    // Each viewer's cached reads may predate another viewer's writes; switching re-reads the workspace.
    void queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_PREFIX })
  }, [queryClient])
  const value = useMemo(() => ({ viewerId, setViewerId, brand }), [viewerId, setViewerId, brand])
  if (restoring && people.isPending) return <p role="status" className="p-6 text-body text-ink-3">Loading the workspace…</p>
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
}
