import type { AgendaItem } from '@/types/workspace-meeting'

export type AgendaControl = 'up' | 'down' | 'drop'

/** The change an agenda control made, as focus needs to know it. */
export type FocusIntent =
  | { kind: 'move'; itemId: string; control: 'up' | 'down' }
  | { kind: 'drop'; index: number }
  | { kind: 'add'; messageId: string }
  | { kind: 'add_text'; priorIds: readonly string[] }

/** Where focus should land once the agenda version after `fromVersion` arrives. */
export type FocusRequest = FocusIntent & { fromVersion: number }

/**
 * The control to focus in the new agenda: the moved item's same button, or its sibling when the move
 * reached an edge; after a drop, the Drop button of the item now in that place; after adding a finding or
 * a free-text item, the new item's Move up (Move down when it is first). Undefined when no such control is live.
 */
export function focusAfterChange(request: FocusRequest, items: readonly AgendaItem[]): { itemId: string; control: AgendaControl } | undefined {
  // A lone item's controls are all off: nothing there can take focus.
  if (items.length < 2) return undefined
  if (request.kind === 'drop') return { itemId: items[Math.min(request.index, items.length - 1)]!.id, control: 'drop' }
  const index = indexOfSubject(request, items)
  if (index === -1) return undefined
  const item = items[index]!
  const wanted: 'up' | 'down' = request.kind === 'move' ? request.control : 'up'
  const atEdge = wanted === 'up' ? index === 0 : index === items.length - 1
  return { itemId: item.id, control: atEdge ? (wanted === 'up' ? 'down' : 'up') : wanted }
}

/** Where the item a move or an addition acted on now sits. A free-text item is the one whose id the agenda did not hold before. */
function indexOfSubject(request: Exclude<FocusIntent, { kind: 'drop' }>, items: readonly AgendaItem[]): number {
  switch (request.kind) {
    case 'move': return items.findIndex((i) => i.id === request.itemId)
    case 'add': return items.findIndex((i) => i.source.kind === 'finding' && i.source.messageId === request.messageId)
    case 'add_text': {
      const prior = new Set(request.priorIds)
      return items.findIndex((i) => !prior.has(i.id))
    }
  }
}
