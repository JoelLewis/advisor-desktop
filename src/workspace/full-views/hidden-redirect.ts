/** The router state a View-as redirect leaves for the home page: what the new viewer could not see. */
export type HiddenRedirect = { hiddenSubject: string }

export function hiddenRedirectOf(state: unknown): HiddenRedirect | undefined {
  if (typeof state !== 'object' || state === null || !('hiddenSubject' in state)) return undefined
  return typeof state.hiddenSubject === 'string' ? { hiddenSubject: state.hiddenSubject } : undefined
}
