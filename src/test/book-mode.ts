import { bookModeKey } from '@/workspace/shell/book-mode'

/** Opens the viewer's column on Conversations, for a test that reaches a thread through the list. */
export function showConversationsFor(viewerId = 'user-001'): void {
  localStorage.setItem(bookModeKey(viewerId), 'conversations')
}
