/** An account's full view, remembering the thread it was opened from so the view can link back. */
export const accountFullViewHref = (accountId: string, fromThreadId?: string) =>
  `/accounts/${encodeURIComponent(accountId)}${fromThreadId ? `?from=${encodeURIComponent(fromThreadId)}` : ''}`
