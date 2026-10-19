import { useContext } from 'react'
import { ViewerContext, type ViewerContextValue } from './viewer-context'

export function useViewer(): ViewerContextValue {
  const value = useContext(ViewerContext)
  if (!value) throw new Error('useViewer must be used inside a ViewerProvider')
  return value
}
