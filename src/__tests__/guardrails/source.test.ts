import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  UI_ROOTS, listSourceFiles, findPaletteViolations, findColourLiterals, findFormatterBypass, findRawElements, findRawTokenVars,
  colourLiteralsOutsideTokens,
} from './detectors'

const files = UI_ROOTS.flatMap(listSourceFiles)
const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

describe('UI source guardrails', () => {
  it('scans a non-trivial set of files', () => expect(files.length).toBeGreaterThan(3))
  it.each(files)('%s uses only instrument colours', (f) => {
    expect(findPaletteViolations(read(f))).toEqual([])
    expect(findColourLiterals(read(f))).toEqual([])
    expect(findRawTokenVars(read(f))).toEqual([])
  })
  it.each(files.filter((f) => f !== 'src/kit/measure.ts'))('%s formats only through measure', (f) => {
    expect(findFormatterBypass(read(f))).toEqual([])
  })
  it.each(files.filter((f) => !f.startsWith('src/kit/')))('%s uses kit elements', (f) => {
    expect(findRawElements(read(f))).toEqual([])
  })
  it('app.css has colour values only inside the token block', () => {
    expect(colourLiteralsOutsideTokens(read('src/styles/app.css'))).toEqual([])
  })
})
