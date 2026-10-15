export type Visibility = 'private' | 'internal' | 'client'

/** The mark each visibility draws: dashed for only you, hatched for the firm, solid for the client's thread. */
export const VISIBILITY_RULE: Readonly<Record<Visibility, string>> = {
  private: 'border-t-2 border-dashed border-ink-2',
  internal: 'hatch h-2 border-y border-ink-2',
  client: 'border-t-4 border-ink',
}
