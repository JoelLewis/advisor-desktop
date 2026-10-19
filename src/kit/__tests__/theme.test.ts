import { describe, it, expect, afterEach, vi } from 'vitest'
import { applyTheme, readThemeChoice, saveThemeChoice, themeFromSearch, themeLabel } from '@/kit/theme'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.removeAttribute('data-theme')
  try { localStorage.clear() } catch { /* storage unavailable in this test */ }
})

describe('theme', () => {
  it('applyTheme sets data-theme for light/dark and removes it for system', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
  it('round-trips through storage', () => {
    saveThemeChoice('light')
    expect(readThemeChoice()).toBe('light')
  })
  it('falls back to system when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => saveThemeChoice('dark')).not.toThrow()
    expect(readThemeChoice()).toBe('system')
  })
  it('ignores an unknown stored value', () => {
    localStorage.setItem('ws-theme', 'purple')
    expect(readThemeChoice()).toBe('system')
  })
  it('reads ?theme= for screenshots', () => {
    expect(themeFromSearch('?theme=dark')).toBe('dark')
    expect(themeFromSearch('?theme=nope')).toBeNull()
    expect(themeFromSearch('')).toBeNull()
  })
  it('labels system with what it resolved to', () => {
    expect(['light', 'dark', 'system'].map((c) => themeLabel(c as 'light' | 'dark' | 'system', true))).toEqual(['Theme: light', 'Theme: dark', 'Theme: system (dark)'])
    expect(themeLabel('system', false)).toBe('Theme: system (light)')
  })
})
