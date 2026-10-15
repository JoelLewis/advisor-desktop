import { afterEach, describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { THEME_STORAGE_KEY, initialThemeAttribute } from '@/kit/theme'

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
const boot = /<script>([\s\S]*?ws-theme[\s\S]*?)<\/script>/.exec(html)?.[1]
if (!boot) throw new Error('index.html has no inline theme script')
const run = () => new Function(boot)()

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  localStorage.clear()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('the inline theme script agrees with theme.ts', () => {
  const STORED = [null, 'light', 'dark', 'system', 'junk']
  const SEARCH = ['', '?theme=light', '?theme=dark', '?theme=system', '?theme=junk']
  it.each(STORED.flatMap((stored) => SEARCH.map((search) => [stored, search] as const)))('stored %s, search "%s"', (stored, search) => {
    if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored)
    window.history.pushState({}, '', `/t/th-brief${search}`)
    run()
    expect(document.documentElement.getAttribute('data-theme')).toBe(initialThemeAttribute(search, stored))
  })
  it('reads the same storage key as theme.ts', () => expect(boot).toContain(`'${THEME_STORAGE_KEY}'`))
  it('falls back when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    window.history.pushState({}, '', '/?theme=dark')
    expect(run).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
  it('declares both color schemes', () => expect(html).toContain('<meta name="color-scheme" content="light dark" />'))
})
