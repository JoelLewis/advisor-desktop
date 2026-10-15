/** The shell's phone layout, as Tailwind's `max-narrow:` variant states it. */
export const PHONE_LAYOUT_QUERY = '(width < 768px)'

export type PhonePane = 'threads' | 'thread' | 'context'

export const PHONE_PANE_WORDS: Readonly<Record<PhonePane, string>> = { threads: 'Threads', thread: 'Thread', context: 'Context' }

export function phonePanes({ listHidden, hasContext }: { listHidden: boolean; hasContext: boolean }): PhonePane[] {
  return [...(listHidden ? [] : ['threads' as const]), 'thread', ...(hasContext ? ['context' as const] : [])]
}

/** The thread comes first on a thread route; the home page opens on the list; any other page on itself. */
export function defaultPhonePane(pathname: string, listHidden: boolean): PhonePane {
  return pathname === '/' && !listHidden ? 'threads' : 'thread'
}
