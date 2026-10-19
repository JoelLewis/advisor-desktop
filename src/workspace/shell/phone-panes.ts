/** The shell's phone layout, as Tailwind's `max-narrow:` variant states it. */
export const PHONE_LAYOUT_QUERY = '(width < 768px)'

export type PhonePane = 'threads' | 'thread' | 'context'

/**
 * The left column's name: the firm's Book, or an outsider's Threads. Until the directory says who is viewing it is
 * just a List, so a client never sees the firm's word. Its phone tab and jump key say the same.
 */
export const columnLabelOf = (external: boolean | undefined): 'Book' | 'Threads' | 'List' =>
  external === undefined ? 'List' : external ? 'Threads' : 'Book'

export const phonePaneWords = (external: boolean | undefined): Readonly<Record<PhonePane, string>> =>
  ({ threads: columnLabelOf(external), thread: 'Thread', context: 'Context' })

export function phonePanes({ listHidden, hasContext }: { listHidden: boolean; hasContext: boolean }): PhonePane[] {
  return [...(listHidden ? [] : ['threads' as const]), 'thread', ...(hasContext ? ['context' as const] : [])]
}

/** The thread comes first on a thread route; the home page opens on the list; any other page on itself. */
export function defaultPhonePane(pathname: string, listHidden: boolean): PhonePane {
  return pathname === '/' && !listHidden ? 'threads' : 'thread'
}
