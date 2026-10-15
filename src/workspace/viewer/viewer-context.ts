import { createContext } from 'react'
import type { Directory } from '@/types/workspace'

/** The advisor, Adrian Hale: the workspace opens as him. */
export const DEFAULT_VIEWER_ID = 'user-001'

export type ViewerContextValue = {
  viewerId: string
  setViewerId: (id: string) => void
}

export const ViewerContext = createContext<ViewerContextValue | null>(null)

/** The chosen viewer if the directory knows them; an id it does not know (a stale or edited session) falls back to the advisor. */
export function resolveViewer(chosenId: string, directory: Directory | undefined): string {
  if (chosenId === DEFAULT_VIEWER_ID || !directory) return chosenId
  return directory.people.some((p) => p.id === chosenId) ? chosenId : DEFAULT_VIEWER_ID
}
