import { afterEach, describe, it, expect, vi } from 'vitest'
import { SINGLE_KEYS_STORAGE_KEY, isCommandChord, isSheetChord, readSingleKeys, saveSingleKeys } from '@/kit/keyboard/single-keys'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })
const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)

describe('the single-key shortcuts setting', () => {
  it('is on by default and remembers off', () => {
    expect(readSingleKeys()).toBe(true)
    saveSingleKeys(false)
    expect(localStorage.getItem(SINGLE_KEYS_STORAGE_KEY)).toBe('off')
    expect(readSingleKeys()).toBe(false)
    saveSingleKeys(true)
    expect(readSingleKeys()).toBe(true)
  })
  it('reads on when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readSingleKeys()).toBe(true)
    expect(() => saveSingleKeys(false)).not.toThrow()
  })
  it('knows the two modifier routes', () => {
    expect(isCommandChord(key({ key: 'k', ctrlKey: true }))).toBe(true)
    expect(isCommandChord(key({ key: 'K', metaKey: true }))).toBe(true)
    expect(isCommandChord(key({ key: 'K', metaKey: true, shiftKey: true })), 'Shift is not part of the chord').toBe(false)
    expect(isCommandChord(key({ key: 'k', ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(isCommandChord(key({ key: 'k', ctrlKey: true, altKey: true }))).toBe(false)
    expect(isCommandChord(key({ key: 'k' }))).toBe(false)
    expect(isSheetChord(key({ key: '/', metaKey: true }))).toBe(true)
    expect(isSheetChord(key({ key: '?', shiftKey: true }))).toBe(false)
  })
})

describe("Ctrl+K in a Mac's text field", () => {
  const inField = (init: KeyboardEventInit) => {
    const field = document.createElement('textarea')
    document.body.append(field)
    const event = key({ ...init, bubbles: true })
    let seen: KeyboardEvent | undefined
    field.addEventListener('keydown', (e) => { seen = e })
    field.dispatchEvent(event)
    field.remove()
    if (!seen) throw new Error('the field saw no keydown')
    return seen
  }
  it("is left to the field's kill-line on a Mac; ⌘K still opens the command line", () => {
    expect(isCommandChord(inField({ key: 'k', ctrlKey: true }), true)).toBe(false)
    expect(isCommandChord(inField({ key: 'k', metaKey: true }), true)).toBe(true)
  })
  it('opens the command line outside a field on a Mac, and anywhere elsewhere', () => {
    expect(isCommandChord(key({ key: 'k', ctrlKey: true }), true)).toBe(true)
    expect(isCommandChord(inField({ key: 'k', ctrlKey: true }), false)).toBe(true)
  })
})
