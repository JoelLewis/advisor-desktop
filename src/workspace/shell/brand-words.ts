import { APP_NAME } from '@/app/document-title'
import { FIRM_NAME } from '@/lib/firm'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import type { Directory } from '@/types/workspace'

/** The product to the firm; to a client or a prospect, the firm they deal with, and their own name. */
export function brandOf(directory: Directory | undefined, viewerId: string): { name: string; viewerName?: string } {
  if (!directory || !isExternalViewerIn(directory, viewerId)) return { name: APP_NAME }
  const viewer = directory.people.find((p) => p.id === viewerId)
  if (!viewer) throw new Error(`Viewer ${viewerId} is not in their own directory`)
  return { name: FIRM_NAME, viewerName: viewer.name }
}
