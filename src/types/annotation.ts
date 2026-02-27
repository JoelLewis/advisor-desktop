export type AnnotationTheme = 'ai_embedded' | 'actionable_ux' | 'smart_workflows' | 'batch_actions'

export type Annotation = {
  id: string
  number: number
  title: string
  description: string
  theme: AnnotationTheme
  anchor: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center-right' | 'center-left'
  offset?: { x: number; y: number }
}

export type RouteAnnotations = {
  route: string
  pageTitle: string
  pageDescription: string
  annotations: Annotation[]
}
