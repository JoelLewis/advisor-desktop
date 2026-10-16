import { APP_NAME } from '@/app/document-title'
import { FIRM_NAME } from '@/lib/firm'
import { isExternalRole } from '@/lib/external-party'
import { DEFAULT_VIEWER_ID } from '@/workspace/viewer/viewer-context'
import type { Person } from '@/types/workspace'

export type Brand = { name: string; viewerName?: string }

/**
 * The product to the firm; to a client or a prospect, the firm they deal with and their own name. Someone the
 * directory does not (yet) know is shown the firm's name, never the product's, and no person's name.
 */
export function brandOf(viewerId: string, people: readonly Person[] | undefined): Brand {
  if (viewerId === DEFAULT_VIEWER_ID) return { name: APP_NAME }
  const viewer = people?.find((p) => p.id === viewerId)
  if (!viewer) return { name: FIRM_NAME }
  return isExternalRole(viewer.role) ? { name: FIRM_NAME, viewerName: viewer.name } : { name: APP_NAME }
}
