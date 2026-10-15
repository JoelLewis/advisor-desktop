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
    expect(isCommandChord(key({ key: 'K', metaKey: true, shiftKey: true }))).toBe(true)
    expect(isCommandChord(key({ key: 'k', ctrlKey: true, altKey: true }))).toBe(false)
    expect(isCommandChord(key({ key: 'k' }))).toBe(false)
    expect(isSheetChord(key({ key: '/', metaKey: true }))).toBe(true)
    expect(isSheetChord(key({ key: '?', shiftKey: true }))).toBe(false)
  })
})
