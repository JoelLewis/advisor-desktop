import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WORKSPACE_QUERY_PREFIX, useViewAsDirectory } from '@/hooks/use-workspace'
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
  const people = useViewAsDirectory(restoring)
  const viewerId = chosenId ?? resolveViewer(restoredId, people.data)
  const setViewerId = useCallback((id: string) => {
    setChosenId(id)
    storeViewer(id)
    // Each viewer's cached reads may predate another viewer's writes; switching re-reads the workspace.
    void queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_PREFIX })
  }, [queryClient])
  const value = useMemo(() => ({ viewerId, setViewerId }), [viewerId, setViewerId])
  if (restoring && people.isPending) return <p role="status" className="p-6 text-body text-ink-3">Loading the workspace…</p>
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
}
