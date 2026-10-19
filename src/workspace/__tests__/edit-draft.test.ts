import { describe, it, expect } from 'vitest'
import { draftReducer, isExcluded, lotsOf, quantityOf, sameEdits } from '@/workspace/workbench/edit-draft'

const start = { base: 1, edits: [] }

describe('the draft reducer', () => {
  it('toggles an exclusion on and off', () => {
    const on = draftReducer(start, { type: 'toggle_exclude', symbol: 'QAI' })
    expect(isExcluded(on.edits, 'QAI')).toBe(true)
    expect(draftReducer(on, { type: 'toggle_exclude', symbol: 'QAI' }).edits).toEqual([])
  })
  it('sets and clears a quantity and lots, one edit per kind per symbol', () => {
    let s = draftReducer(start, { type: 'set_quantity', symbol: 'INTC', quantity: 6000 })
    s = draftReducer(s, { type: 'set_quantity', symbol: 'INTC', quantity: 5000 })
    expect(quantityOf(s.edits, 'INTC')).toBe(5000)
    s = draftReducer(s, { type: 'set_lots', symbol: 'SPY', lotIds: ['lot-pos-020-1'] })
    expect(lotsOf(s.edits, 'SPY')).toEqual(['lot-pos-020-1'])
    s = draftReducer(s, { type: 'set_quantity', symbol: 'INTC', quantity: undefined })
    expect(quantityOf(s.edits, 'INTC')).toBeUndefined()
    expect(s.edits).toHaveLength(1)
  })
  it('an exclusion drops the quantity and lots edits on that symbol, so the draft never sends a conflict', () => {
    let s = draftReducer(start, { type: 'set_quantity', symbol: 'SPY', quantity: 500 })
    s = draftReducer(s, { type: 'set_lots', symbol: 'SPY', lotIds: ['lot-pos-020-1'] })
    s = draftReducer(s, { type: 'set_quantity', symbol: 'INTC', quantity: 6000 })
    s = draftReducer(s, { type: 'toggle_exclude', symbol: 'SPY' })
    expect(s.edits).toEqual([{ kind: 'quantity', symbol: 'INTC', quantity: 6000 }, { kind: 'exclude', symbol: 'SPY' }])
  })
  it('keeps an empty lot selection so the engine can refuse it', () => {
    expect(lotsOf(draftReducer(start, { type: 'set_lots', symbol: 'SPY', lotIds: [] }).edits, 'SPY')).toEqual([])
  })
  it('compares edit sets regardless of order, and resets to a base', () => {
    expect(sameEdits([{ kind: 'exclude', symbol: 'QAI' }, { kind: 'exclude', symbol: 'GLD' }], [{ kind: 'exclude', symbol: 'GLD' }, { kind: 'exclude', symbol: 'QAI' }])).toBe(true)
    expect(draftReducer({ base: 1, edits: [{ kind: 'exclude', symbol: 'QAI' }] }, { type: 'reset', base: 3, edits: [] })).toEqual({ base: 3, edits: [] })
  })
})
