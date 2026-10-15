export type Visibility = 'private' | 'internal' | 'client'
/** Whose work the band is about. The kit's own word for it; the workspace decides which. */
export type Party = 'client' | 'prospect'

/** The mark each visibility draws: dashed for only you, hatched for the firm, solid for the client's thread. */
export const VISIBILITY_RULE: Readonly<Record<Visibility, string>> = {
  private: 'border-t-2 border-dashed border-ink-2',
  internal: 'hatch h-2 border-y border-ink-2',
  client: 'border-t-4 border-ink',
}

/** The band's words: who can read what sits under it. */
export function visibilityWords(visibility: Visibility, party: Party = 'client'): string {
  switch (visibility) {
    case 'private': return 'Only you'
    case 'internal': return `Firm only · ${party} can't see`
    case 'client': return `${party.toUpperCase()} CAN SEE`
  }
}
