import { createContext } from 'react'

export type ViewerContextValue = {
  viewerId: string
  setViewerId: (id: string) => void
}

export const ViewerContext = createContext<ViewerContextValue | null>(null)
