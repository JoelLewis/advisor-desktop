export type Visibility = 'private' | 'internal' | 'client'

export const VISIBILITY_WORDS: Record<Visibility, string> = {
  private: 'Only you',
  internal: "Firm only · client can't see",
  client: 'CLIENT CAN SEE',
}
