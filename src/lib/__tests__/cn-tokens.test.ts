import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COLOUR_TOKENS, FONT_SIZE_TOKENS } from '@/lib/utils'

const css = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8')

function themeBlock(source: string): string {
  const start = source.indexOf('@theme {')
  if (start === -1) throw new Error('app.css has no @theme block')
  let depth = 0
  for (let i = start + '@theme '.length; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error('@theme block is not closed')
}

// Matches declarations like `--color-ink-2:`; sub-properties such as `--text-label--line-height:` do not match.
function declaredNames(block: string, prefix: 'color' | 'text'): Set<string> {
  const pattern = new RegExp(`--${prefix}-([a-z0-9]+(?:-[a-z0-9]+)*):`, 'g')
  return new Set([...block.matchAll(pattern)].map((m) => m[1]!))
}

const theme = themeBlock(css)

describe('cn token lists match the @theme block in app.css', () => {
  it('registers every colour token declared in @theme', () => {
    expect(new Set(COLOUR_TOKENS)).toEqual(declaredNames(theme, 'color'))
  })
  it('registers every font-size token declared in @theme', () => {
    expect(new Set(FONT_SIZE_TOKENS)).toEqual(declaredNames(theme, 'text'))
  })
})
