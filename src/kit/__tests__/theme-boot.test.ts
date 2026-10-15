import { afterEach, describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { THEME_STORAGE_KEY, initialThemeAttribute, themeLabel } from '@/kit/theme'

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

describe("the static first frame's theme label is the one ThemeToggle draws", () => {
  const labelScript = /<script>((?:(?!<\/script>)[\s\S])*?boot-theme-label(?:(?!<\/script>)[\s\S])*)<\/script>/.exec(html)?.[1]
  if (!labelScript) throw new Error('index.html has no inline theme-label script')
  const ATTRIBUTES = [null, 'light', 'dark'] as const
  it.each(ATTRIBUTES.flatMap((attribute) => [true, false].map((dark) => [attribute, dark] as const)))('data-theme %s, system dark %s', (attribute, dark) => {
    document.body.innerHTML = '<span id="boot-theme-label">Theme: system (light)</span>'
    if (attribute) document.documentElement.setAttribute('data-theme', attribute)
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ matches: dark && query === '(prefers-color-scheme: dark)', media: query } as MediaQueryList))
    new Function(labelScript)()
    expect(document.getElementById('boot-theme-label')).toHaveTextContent(themeLabel(attribute ?? 'system', dark))
    document.body.innerHTML = ''
  })
})
