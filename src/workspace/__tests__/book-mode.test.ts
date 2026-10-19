import { describe, it, expect, vi } from 'vitest'
import { bookModeKey, readBookMode, storeBookMode } from '@/workspace/shell/book-mode'

describe('the book mode', () => {
  it('opens on Households', () => expect(readBookMode('user-001')).toBe('households'))
  it('each viewer keeps their own mode', () => {
    storeBookMode('user-001', 'conversations')
    expect(readBookMode('user-001')).toBe('conversations')
    expect(readBookMode('user-002')).toBe('households')
    expect(localStorage.getItem(bookModeKey('user-001'))).toBe('conversations')
  })
  it('a stored value it does not know opens on Households', () => {
    localStorage.setItem(bookModeKey('user-001'), 'threads')
    expect(readBookMode('user-001')).toBe('households')
  })
  it('blocked storage opens on Households and keeps nothing, without throwing', () => {
    const blocked = () => { throw new DOMException('blocked', 'SecurityError') }
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    expect(readBookMode('user-001')).toBe('households')
    expect(() => storeBookMode('user-001', 'conversations')).not.toThrow()
    get.mockRestore()
    set.mockRestore()
  })
  it('rethrows what is not a storage refusal', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new TypeError('broken') })
    expect(() => readBookMode('user-001')).toThrow('broken')
    get.mockRestore()
  })
})
