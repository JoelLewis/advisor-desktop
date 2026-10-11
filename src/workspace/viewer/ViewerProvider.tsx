import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_VIEWER_ID, ViewerContext } from './viewer-context'

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
  const [viewerId, setViewerState] = useState(readStoredViewer)
  const setViewerId = useCallback((id: string) => {
    setViewerState(id)
    storeViewer(id)
  }, [])
  const value = useMemo(() => ({ viewerId, setViewerId }), [viewerId, setViewerId])
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
}
