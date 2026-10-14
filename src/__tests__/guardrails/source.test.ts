import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readdirSync } from 'node:fs'
import {
  ENGINE_ROOTS, uiRoots, listSourceFiles, findPaletteViolations, findColorLiterals, findFormatterBypass, findRawElements, findRawTokenVars, findBreakpointLiterals,
  colorLiteralsOutsideTokens,
} from './detectors'

const ui = uiRoots()
const files = ui.flatMap(listSourceFiles)
const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

describe('scan scope', () => {
  const topLevel = readdirSync(join(process.cwd(), 'src')).map((name) => `src/${name}`)
  it.each(topLevel)('%s is classified as UI or engine, never both', (entry) => {
    expect(Number(ui.includes(entry)) + Number(ENGINE_ROOTS.includes(entry))).toBe(1)
  })
  it.each([...ENGINE_ROOTS])('engine root %s exists', (root) => expect(topLevel).toContain(root))
  it('scans the kit, the app and the entry point', () => {
    expect(ui).toEqual(expect.arrayContaining(['src/kit', 'src/app', 'src/main.tsx']))
    expect(files).toContain('src/main.tsx')
  })
})

describe('UI source guardrails', () => {
  it('scans a non-trivial set of files', () => expect(files.length).toBeGreaterThan(3))
  it.each(files)('%s uses only instrument colors', (f) => {
    expect(findPaletteViolations(read(f))).toEqual([])
    expect(findColorLiterals(read(f))).toEqual([])
    expect(findRawTokenVars(read(f))).toEqual([])
  })
  it.each(files.filter((f) => f !== 'src/kit/measure.ts'))('%s formats only through measure', (f) => {
    expect(findFormatterBypass(read(f))).toEqual([])
  })
  it.each(files.filter((f) => !f.startsWith('src/kit/')))('%s uses kit elements', (f) => {
    expect(findRawElements(read(f))).toEqual([])
  })
  it.each(files)('%s uses the breakpoint tokens', (f) => {
    expect(findBreakpointLiterals(read(f))).toEqual([])
  })
  it('app.css defines the breakpoint tokens', () => {
    expect(read('src/styles/app.css')).toMatch(/--breakpoint-narrow:\s*768px;[\s\S]*--breakpoint-split:\s*1100px;[\s\S]*--breakpoint-wide:\s*1440px;/)
  })
  it('app.css has color values only inside the token block', () => {
    expect(colorLiteralsOutsideTokens(read('src/styles/app.css'))).toEqual([])
  })
})
