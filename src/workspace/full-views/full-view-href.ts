/** A full view's path, remembering the thread it was opened from so the view can link back. */
const withFrom = (path: string, fromThreadId?: string) => `${path}${fromThreadId ? `?from=${encodeURIComponent(fromThreadId)}` : ''}`

export const accountFullViewHref = (accountId: string, fromThreadId?: string) => withFrom(`/accounts/${encodeURIComponent(accountId)}`, fromThreadId)
export const meetingFullViewHref = (eventId: string, fromThreadId?: string) => withFrom(`/meetings/${encodeURIComponent(eventId)}`, fromThreadId)
export const householdFullViewHref = (householdId: string, fromThreadId?: string) => withFrom(`/households/${encodeURIComponent(householdId)}`, fromThreadId)
export const prospectFullViewHref = (prospectId: string, fromThreadId?: string) => withFrom(`/prospects/${encodeURIComponent(prospectId)}`, fromThreadId)
export const clientFullViewHref = (clientId: string, fromThreadId?: string) => withFrom(`/clients/${encodeURIComponent(clientId)}`, fromThreadId)
