import { createContext } from 'react'

/** The advisor, Adrian Hale: the workspace opens as him. */
export const DEFAULT_VIEWER_ID = 'user-001'

export type ViewerContextValue = {
  viewerId: string
  setViewerId: (id: string) => void
}

export const ViewerContext = createContext<ViewerContextValue | null>(null)
