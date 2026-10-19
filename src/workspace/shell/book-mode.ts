/** What the firm's left column shows: the book of households, or the conversations. Households opens first. */
const BOOK_MODES = ['households', 'conversations'] as const
export type BookMode = (typeof BOOK_MODES)[number]

export const BOOK_MODE_OPTIONS: readonly { value: BookMode; label: string }[] = [
  { value: 'households', label: 'Households' }, { value: 'conversations', label: 'Conversations' },
]

const DEFAULT_MODE: BookMode = 'households'
const isBookMode = (value: unknown): value is BookMode => BOOK_MODES.some((m) => m === value)

/** Each viewer's own choice, kept in this browser. */
export const bookModeKey = (viewerId: string): string => `ws-book-mode:${viewerId}`

/** A browser that refuses storage (private mode, blocked site data) refuses with a DOMException; anything else is a bug. */
const isStorageRefusal = (error: unknown): error is DOMException => error instanceof DOMException

export function readBookMode(viewerId: string): BookMode {
  try {
    const stored = localStorage.getItem(bookModeKey(viewerId))
    return isBookMode(stored) ? stored : DEFAULT_MODE
  } catch (error) {
    if (isStorageRefusal(error)) return DEFAULT_MODE
    throw error
  }
}

/** Keeps the choice; where storage is refused, the choice lasts until the page is reloaded. */
export function storeBookMode(viewerId: string, mode: BookMode): void {
  try {
    localStorage.setItem(bookModeKey(viewerId), mode)
  } catch (error) {
    if (!isStorageRefusal(error)) throw error
  }
}
