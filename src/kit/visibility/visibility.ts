export type Visibility = 'private' | 'internal' | 'client'
/** Whose work the band is about. The kit's own word for it; the workspace decides which. */
export type Party = 'client' | 'prospect'

/** The band's words: who can read what sits under it. */
export function visibilityWords(visibility: Visibility, party: Party = 'client'): string {
  switch (visibility) {
    case 'private': return 'Only you'
    case 'internal': return `Firm only · ${party} can't see`
    case 'client': return `${party.toUpperCase()} CAN SEE`
  }
}
