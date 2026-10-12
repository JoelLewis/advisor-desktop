import type { LegEdit } from '@/types/workspace-proposal'

/** The workbench's unsaved edits. base: the version the draft builds on. */
export type DraftState = { base: number; edits: LegEdit[] }
export type DraftAction =
  | { type: 'toggle_exclude'; symbol: string }
  | { type: 'set_quantity'; symbol: string; quantity: number | undefined }
  | { type: 'set_lots'; symbol: string; lotIds: string[] }
  | { type: 'reset'; base: number; edits: LegEdit[] }

/** What the quantity field holds against the draft: nothing new, a quantity to commit, or text that is not a number. */
export type TypedQuantity = 'none' | 'differs' | 'unparseable'

/** Blank means the agent's quantity; anything else must read as a number. Whether it is a valid quantity is the engine's call. */
export function parseQuantityText(text: string): { ok: true; quantity: number | undefined } | { ok: false } {
  if (text.trim() === '') return { ok: true, quantity: undefined }
  const quantity = Number(text.replace(/,/g, ''))
  return Number.isFinite(quantity) ? { ok: true, quantity } : { ok: false }
}

const KIND_ORDER: Readonly<Record<LegEdit['kind'], number>> = { exclude: 0, quantity: 1, lots: 2 }

export const normaliseDraftEdits = (edits: readonly LegEdit[]): LegEdit[] =>
  [...edits].sort((a, b) => a.symbol.localeCompare(b.symbol) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])

export const sameEdits = (a: readonly LegEdit[], b: readonly LegEdit[]): boolean =>
  JSON.stringify(normaliseDraftEdits(a)) === JSON.stringify(normaliseDraftEdits(b))

export const isExcluded = (edits: readonly LegEdit[], symbol: string): boolean =>
  edits.some((e) => e.kind === 'exclude' && e.symbol === symbol)

export function quantityOf(edits: readonly LegEdit[], symbol: string): number | undefined {
  const edit = edits.find((e) => e.kind === 'quantity' && e.symbol === symbol)
  return edit?.kind === 'quantity' ? edit.quantity : undefined
}

export function lotsOf(edits: readonly LegEdit[], symbol: string): string[] | undefined {
  const edit = edits.find((e) => e.kind === 'lots' && e.symbol === symbol)
  return edit?.kind === 'lots' ? edit.lotIds : undefined
}

const without = (edits: readonly LegEdit[], kinds: readonly LegEdit['kind'][], symbol: string) =>
  edits.filter((e) => !(kinds.includes(e.kind) && e.symbol === symbol))

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'toggle_exclude':
      // An excluded leg has no quantity or lots, so those edits go with it; the engine refuses the pair.
      return isExcluded(state.edits, action.symbol)
        ? { ...state, edits: without(state.edits, ['exclude'], action.symbol) }
        : { ...state, edits: [...without(state.edits, ['quantity', 'lots'], action.symbol), { kind: 'exclude', symbol: action.symbol }] }
    case 'set_quantity': {
      const rest = without(state.edits, ['quantity'], action.symbol)
      return { ...state, edits: action.quantity === undefined ? rest : [...rest, { kind: 'quantity', symbol: action.symbol, quantity: action.quantity }] }
    }
    case 'set_lots':
      return { ...state, edits: [...without(state.edits, ['lots'], action.symbol), { kind: 'lots', symbol: action.symbol, lotIds: action.lotIds }] }
    case 'reset':
      return { base: action.base, edits: action.edits }
  }
}
