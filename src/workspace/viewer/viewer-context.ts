import { createContext } from 'react'
import type { Directory } from '@/types/workspace'
import type { Brand } from '@/workspace/shell/brand-words'

/** The advisor, Adrian Hale: the workspace opens as him. */
export const DEFAULT_VIEWER_ID = 'user-001'

export type ViewerContextValue = {
  viewerId: string
  setViewerId: (id: string) => void
  /** The header's and the tab's name for this viewer, known as soon as the viewer is. */
  brand: Brand
}

export const ViewerContext = createContext<ViewerContextValue | null>(null)

/** The chosen viewer if the directory knows them; an id it does not know (a stale or edited session) falls back to the advisor. */
export function resolveViewer(chosenId: string, directory: Directory | undefined): string {
  if (chosenId === DEFAULT_VIEWER_ID || !directory) return chosenId
  return directory.people.some((p) => p.id === chosenId) ? chosenId : DEFAULT_VIEWER_ID
}
