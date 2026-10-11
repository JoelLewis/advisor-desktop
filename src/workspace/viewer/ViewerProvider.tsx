import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ViewerContext } from './viewer-context'

const STORAGE_KEY = 'ws-viewer'
const DEFAULT_VIEWER = 'user-001'

function readStoredViewer(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? DEFAULT_VIEWER
  } catch {
    return DEFAULT_VIEWER
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
