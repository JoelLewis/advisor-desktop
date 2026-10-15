/** The router state a View-as redirect leaves for the home page: who could not see what. Read once, then cleared. */
export type HiddenRedirect = { hiddenSubject: string; hiddenFrom: string }

export function hiddenRedirectOf(state: unknown): HiddenRedirect | undefined {
  if (typeof state !== 'object' || state === null || !('hiddenSubject' in state) || !('hiddenFrom' in state)) return undefined
  const { hiddenSubject, hiddenFrom } = state
  return typeof hiddenSubject === 'string' && typeof hiddenFrom === 'string' ? { hiddenSubject, hiddenFrom } : undefined
}
