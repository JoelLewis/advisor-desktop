import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TABULAR_NUMS } from '../utils'

describe('tabular figures', () => {
  it('exports the class pair every numeric surface uses', () => {
    expect(TABULAR_NUMS).toBe('font-mono tabular-figures')
  })

  it('defines the tabular-figures utility in the stylesheet', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain('@utility tabular-figures')
  })

  it('sets both tnum and zero so Phase 3 is a pure font swap', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const block = css.slice(css.indexOf('@utility tabular-figures'))
    const body = block.slice(0, block.indexOf('}') + 1)
    expect(body).toContain('font-feature-settings')
    expect(body).toContain('"tnum" 1')
    expect(body).toContain('"zero" 1')
    expect(body).toContain('font-family')
  })
})
